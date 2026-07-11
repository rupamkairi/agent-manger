import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import type { InstallTarget, MultiTargetResponse, TargetResult } from "@weave/shared";
import type { Db } from "../db/client";
import { copyDirReplace, removeDir } from "../lib/fs-safe";
import { hashDir } from "../lib/hash";
import { isWithin, resolveSkillRootTarget } from "../lib/path-guard";
import { getProjectRow } from "./projects";
import { getResource } from "./resources";
import { scanGlobal, scanProject } from "../scanner/scan";

export function scopeKey(target: Pick<InstallTarget, "scope" | "projectId">): string {
  return target.scope === "global" ? "global" : `project:${target.projectId}`;
}

export async function rescanScopes(db: Db, keys: Set<string>): Promise<void> {
  for (const key of keys) {
    if (key === "global") {
      await scanGlobal(db);
      continue;
    }
    const projectId = key.slice("project:".length);
    const row = await getProjectRow(db, projectId);
    if (!row) continue;
    await scanProject(db, {
      id: row.id,
      name: row.name,
      rootPath: row.root_path,
      addedAt: row.added_at,
      lastScannedAt: row.last_scanned_at,
      exists: true,
    });
  }
}

export interface InstallSourceMeta {
  kind: string;
  [key: string]: unknown;
}

export interface InstallSkillFromDirInput {
  sourceDir: string;
  skillName: string;
  targets: InstallTarget[];
  source: InstallSourceMeta;
}

/**
 * Copies a skill directory into each requested target's skill root, recording
 * an audit row per successful copy and rescanning every distinct affected
 * scope exactly once. Per-target failures do not abort the other targets.
 */
export async function installSkillFromDir(
  db: Db,
  input: InstallSkillFromDirInput,
): Promise<MultiTargetResponse> {
  const results: TargetResult[] = [];
  const rescanKeys = new Set<string>();

  for (const target of input.targets) {
    const resolution = await resolveSkillRootTarget(db, target, input.skillName);
    if (!resolution.ok) {
      results.push({ target, ok: false, installedPath: null, error: resolution.error });
      continue;
    }

    try {
      await copyDirReplace(input.sourceDir, resolution.dest);
      const { dirHash } = await hashDir(resolution.dest);
      await db.run(
        `INSERT INTO skill_installs
          (id, skill_name, agent_id, scope, project_id, installed_path, source_json, content_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          input.skillName,
          target.agentId,
          target.scope,
          target.projectId ?? null,
          resolution.dest,
          JSON.stringify(input.source),
          dirHash,
          new Date().toISOString(),
        ],
      );
      results.push({ target, ok: true, installedPath: resolution.dest, error: null });
      rescanKeys.add(scopeKey(target));
    } catch (error) {
      results.push({
        target,
        ok: false,
        installedPath: null,
        error: error instanceof Error ? error.message : "Failed to install skill",
      });
    }
  }

  const rescanned = rescanKeys.size > 0;
  if (rescanned) await rescanScopes(db, rescanKeys);

  return { results, rescanned };
}

/**
 * Copies an already-indexed skill resource into new targets. Returns null
 * when the resource does not exist or is not a skill, so the route can
 * answer 404.
 */
export async function installSkillFromResource(
  db: Db,
  resourceId: string,
  targets: InstallTarget[],
): Promise<MultiTargetResponse | null> {
  const resource = await getResource(db, resourceId);
  if (!resource || resource.kind !== "skill") return null;

  const skillName = resource.skill.name ?? resource.skill.dirName;
  return installSkillFromDir(db, {
    sourceDir: resource.path,
    skillName,
    targets,
    source: { kind: "resource", resourceId },
  });
}

export type DeleteSkillOutcome =
  | { ok: true; deletedPath: string }
  | { ok: false; code: "not_found" | "bad_request"; error: string };

/**
 * Deletes exactly the on-disk copy identified by `resourceId`. The allowed
 * root is recomputed fresh (never trusting a cached path) and the target is
 * required to realpath-resolve inside that root, and not equal the root
 * itself, before removal.
 */
export async function deleteSkillCopy(db: Db, resourceId: string): Promise<DeleteSkillOutcome> {
  const resource = await getResource(db, resourceId);
  if (!resource || resource.kind !== "skill") {
    return { ok: false, code: "not_found", error: `Skill not found: ${resourceId}` };
  }

  const skillName = resource.skill.dirName;
  const target: InstallTarget = {
    agentId: resource.agentId,
    scope: resource.scope,
    projectId: resource.projectId ?? undefined,
  };

  const resolution = await resolveSkillRootTarget(db, target, skillName);
  if (!resolution.ok) {
    return { ok: false, code: "bad_request", error: resolution.error };
  }

  let realTarget: string;
  try {
    realTarget = await realpath(resource.path);
  } catch {
    return { ok: false, code: "not_found", error: "Skill directory no longer exists" };
  }

  let realRoot: string;
  try {
    realRoot = await realpath(resolution.root);
  } catch {
    return { ok: false, code: "bad_request", error: "Skill root no longer exists" };
  }

  if (!isWithin(realRoot, realTarget) || realTarget === realRoot) {
    return { ok: false, code: "bad_request", error: "Refusing to delete outside the skill root" };
  }

  await removeDir(realTarget);
  await rescanScopes(db, new Set([scopeKey(target)]));

  return { ok: true, deletedPath: realTarget };
}
