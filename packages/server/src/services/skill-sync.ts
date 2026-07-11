import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
  InstallTarget,
  SyncDiff,
  SyncDiffQuery,
  SyncFileDiff,
  SyncFileState,
  SyncRequest,
  SyncResult,
  SyncStatus,
} from "@weave/shared";
import type { Db } from "../db/client";
import { copyDirReplace } from "../lib/fs-safe";
import { hashDir, type DirHashResult } from "../lib/hash";
import { resolveSkillRootTarget } from "../lib/path-guard";
import { rescanScopes, scopeKey } from "./skill-write";

function targetFromQuerySide(
  agentId: SyncDiffQuery["leftAgentId"],
  scope: SyncDiffQuery["leftScope"],
  projectId: string | undefined,
): InstallTarget {
  return { agentId, scope, projectId };
}

function sameTarget(a: InstallTarget, b: InstallTarget): boolean {
  return a.agentId === b.agentId && a.scope === b.scope && (a.projectId ?? null) === (b.projectId ?? null);
}

/** A side "exists" iff <dir>/SKILL.md exists at the resolved destination. */
async function existingSkillPath(dest: string): Promise<string | null> {
  try {
    await stat(join(dest, "SKILL.md"));
  } catch {
    return null;
  }
  try {
    return await realpath(dest);
  } catch {
    return null;
  }
}

function deriveStatus(
  leftPath: string | null,
  rightPath: string | null,
  leftHash: DirHashResult | null,
  rightHash: DirHashResult | null,
  files: SyncFileDiff[],
): SyncStatus {
  if (!leftPath && rightPath) return "right-only";
  if (leftPath && !rightPath) return "left-only";
  if (leftHash && rightHash && leftHash.dirHash === rightHash.dirHash) return "identical";

  let hasLeftNewer = false;
  let hasRightNewer = false;

  for (const diff of files) {
    if (diff.state === "same") continue;
    if (diff.state === "left-only") {
      hasLeftNewer = true;
      continue;
    }
    if (diff.state === "right-only") {
      hasRightNewer = true;
      continue;
    }
    if (diff.leftMtime && diff.rightMtime) {
      if (diff.leftMtime > diff.rightMtime) hasLeftNewer = true;
      else if (diff.rightMtime > diff.leftMtime) hasRightNewer = true;
      else {
        hasLeftNewer = true;
        hasRightNewer = true;
      }
    } else {
      hasLeftNewer = true;
      hasRightNewer = true;
    }
  }

  if (hasLeftNewer && !hasRightNewer) return "left-newer";
  if (hasRightNewer && !hasLeftNewer) return "right-newer";
  return "diverged";
}

/**
 * Compares two per-agent/scope copies of a skill by content hash of every
 * file. Returns null when neither side exists, so the route can answer 404.
 */
export async function getSyncDiff(db: Db, query: SyncDiffQuery): Promise<SyncDiff | null> {
  const left = targetFromQuerySide(query.leftAgentId, query.leftScope, query.leftProjectId);
  const right = targetFromQuerySide(query.rightAgentId, query.rightScope, query.rightProjectId);

  const leftResolution = await resolveSkillRootTarget(db, left, query.skillName);
  const rightResolution = await resolveSkillRootTarget(db, right, query.skillName);

  const leftPath = leftResolution.ok ? await existingSkillPath(leftResolution.dest) : null;
  const rightPath = rightResolution.ok ? await existingSkillPath(rightResolution.dest) : null;

  if (!leftPath && !rightPath) return null;

  const leftHash = leftPath ? await hashDir(leftPath) : null;
  const rightHash = rightPath ? await hashDir(rightPath) : null;

  const allPaths = new Set<string>([
    ...(leftHash ? leftHash.files.keys() : []),
    ...(rightHash ? rightHash.files.keys() : []),
  ]);

  const files: SyncFileDiff[] = [];
  for (const relPath of allPaths) {
    const l = leftHash?.files.get(relPath) ?? null;
    const r = rightHash?.files.get(relPath) ?? null;
    let state: SyncFileState;
    if (l && r) state = l.hash === r.hash ? "same" : "modified";
    else if (l && !r) state = "left-only";
    else state = "right-only";

    files.push({
      path: relPath,
      state,
      leftHash: l?.hash ?? null,
      rightHash: r?.hash ?? null,
      leftMtime: l ? new Date(l.mtimeMs).toISOString() : null,
      rightMtime: r ? new Date(r.mtimeMs).toISOString() : null,
    });
  }

  return {
    skillName: query.skillName,
    left,
    right,
    leftPath,
    rightPath,
    status: deriveStatus(leftPath, rightPath, leftHash, rightHash, files),
    files,
  };
}

export type SyncOutcome =
  | { status: "ok"; result: SyncResult }
  | { status: "not_found" | "bad_request"; message: string };

/**
 * Copies a skill's on-disk copy from one target to another, records an
 * audit row (source {kind:"sync", from}), and rescans both affected scopes.
 */
export async function syncSkill(db: Db, request: SyncRequest): Promise<SyncOutcome> {
  if (sameTarget(request.from, request.to)) {
    return { status: "bad_request", message: "from and to targets must differ" };
  }

  const fromResolution = await resolveSkillRootTarget(db, request.from, request.skillName);
  if (!fromResolution.ok) {
    return { status: "bad_request", message: fromResolution.error };
  }
  const sourcePath = await existingSkillPath(fromResolution.dest);
  if (!sourcePath) {
    return { status: "not_found", message: `No skill copy found at the source target` };
  }

  const toResolution = await resolveSkillRootTarget(db, request.to, request.skillName);
  if (!toResolution.ok) {
    return { status: "bad_request", message: toResolution.error };
  }

  const copiedFiles = await copyDirReplace(sourcePath, toResolution.dest);
  const { dirHash } = await hashDir(toResolution.dest);

  await db.run(
    `INSERT INTO skill_installs
      (id, skill_name, agent_id, scope, project_id, installed_path, source_json, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      request.skillName,
      request.to.agentId,
      request.to.scope,
      request.to.projectId ?? null,
      toResolution.dest,
      JSON.stringify({ kind: "sync", from: request.from }),
      dirHash,
      new Date().toISOString(),
    ],
  );

  await rescanScopes(db, new Set([scopeKey(request.from), scopeKey(request.to)]));

  return { status: "ok", result: { copiedFiles, targetPath: toResolution.dest } };
}
