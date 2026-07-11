import { realpath } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { AgentId, ResourceKind, Scope } from "@weave/shared";
import type { Db } from "../db/client";
import { getAdapter } from "../adapters/registry";
import { resolveGlobalPath, resolveProjectPath } from "../adapters/types";
import { splitGlobPattern } from "../scanner/walk";

interface ProjectRootRow {
  root_path: string;
}

export interface GuardedResourceRow {
  kind: ResourceKind;
  original_path: string;
  scope: Scope;
  project_id: string | null;
  agent_id: string;
}

export function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

export function patternsForResource(
  adapter: NonNullable<ReturnType<typeof getAdapter>>,
  kind: ResourceKind,
  scope: Scope,
  projectRoot: string | null,
): string[] {
  const rawPatterns =
    kind === "instruction"
      ? scope === "global"
        ? adapter.instructionFilePatterns.global
        : adapter.instructionFilePatterns.project
      : kind === "memory"
        ? scope === "global"
          ? adapter.memoryPatterns.global
          : adapter.memoryPatterns.project
        : scope === "global"
          ? adapter.globalConfigPaths
          : adapter.projectConfigPaths;
  return rawPatterns.map((pattern) =>
    scope === "global" ? resolveGlobalPath(pattern) : resolveProjectPath(projectRoot ?? "", pattern),
  );
}

export function patternMatches(pattern: string, candidate: string): boolean {
  const { base, rest } = splitGlobPattern(pattern);
  if (!rest || !/[*?[\]{}]/.test(rest)) return candidate === base;
  const rel = relative(base, candidate);
  if (rel.startsWith("..")) return false;
  return new Bun.Glob(rest).match(rel);
}

export async function patternContainmentRoot(pattern: string): Promise<string | null> {
  const { base, rest } = splitGlobPattern(pattern);
  const root = rest && /[*?[\]{}]/.test(rest) ? base : dirname(base);
  try {
    return await realpath(root);
  } catch {
    return null;
  }
}

export async function resolveGuardedResourcePath(
  db: Db,
  row: GuardedResourceRow,
): Promise<string | null> {
  if (row.kind === "skill") return null;
  const adapter = getAdapter(row.agent_id as AgentId);
  if (!adapter) return null;

  let projectRoot: string | null = null;
  let projectContainmentRoot: string | null = null;
  if (row.scope === "project") {
    if (!row.project_id) return null;
    const project = await db.get<ProjectRootRow>("SELECT root_path FROM projects WHERE id = ?", [
      row.project_id,
    ]);
    if (!project) return null;
    projectRoot = project.root_path;
    try {
      projectContainmentRoot = await realpath(project.root_path);
    } catch {
      return null;
    }
  }

  let target: string;
  try {
    target = await realpath(row.original_path);
  } catch {
    return null;
  }

  const patterns = patternsForResource(adapter, row.kind, row.scope, projectRoot);
  for (const pattern of patterns) {
    if (!patternMatches(pattern, row.original_path)) continue;
    const containmentRoot = await patternContainmentRoot(pattern);
    if (!containmentRoot || !isWithin(containmentRoot, target)) continue;
    if (projectContainmentRoot && !isWithin(projectContainmentRoot, target)) continue;
    return target;
  }
  return null;
}

function hasDotDotSegment(path: string): boolean {
  return path.split(/[\\/]/).includes("..");
}

async function realpathNearestExistingAncestor(path: string): Promise<string | null> {
  let current = path;
  for (;;) {
    try {
      const real = await realpath(current);
      const remainder = relative(current, path);
      return remainder ? resolve(real, remainder) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

export interface NewPathInput {
  agentId: AgentId;
  scope: Scope;
  projectId?: string | null;
  path: string;
  kind: ResourceKind;
}

/**
 * Validates a path for a file that does not exist yet: resolves against the
 * agent/scope, rejects ".." segments, and requires an adapter pattern match
 * plus containment of the realpath'd nearest existing ancestor.
 * Returns the absolute target path or null when rejected.
 */
export async function resolveGuardedNewPath(db: Db, input: NewPathInput): Promise<string | null> {
  const adapter = getAdapter(input.agentId);
  if (!adapter) return null;
  if (hasDotDotSegment(input.path)) return null;
  // A concrete new file path must not contain glob metacharacters — otherwise a
  // literal pattern string (e.g. ".claude/memory/**") self-matches its own glob.
  if (/[*?[\]{}]/.test(input.path)) return null;

  let projectRoot: string | null = null;
  let projectContainmentRoot: string | null = null;
  if (input.scope === "project") {
    if (!input.projectId) return null;
    const project = await db.get<ProjectRootRow>("SELECT root_path FROM projects WHERE id = ?", [
      input.projectId,
    ]);
    if (!project) return null;
    projectRoot = project.root_path;
    try {
      projectContainmentRoot = await realpath(project.root_path);
    } catch {
      return null;
    }
  }

  const target =
    input.scope === "global"
      ? resolveGlobalPath(input.path)
      : resolveProjectPath(projectRoot ?? "", input.path);
  if (hasDotDotSegment(target)) return null;

  const resolvedTarget = await realpathNearestExistingAncestor(target);
  if (!resolvedTarget) return null;

  const patterns = patternsForResource(adapter, input.kind, input.scope, projectRoot);
  for (const pattern of patterns) {
    if (!patternMatches(pattern, target)) continue;
    const containmentRoot = await patternContainmentRootForNewPath(pattern);
    if (!containmentRoot || !isWithin(containmentRoot, resolvedTarget)) continue;
    if (projectContainmentRoot && !isWithin(projectContainmentRoot, resolvedTarget)) continue;
    return target;
  }
  return null;
}

// New-path variant: the pattern's base directory may not exist yet (first file
// under e.g. .claude/memory/), so containment resolves through the nearest
// existing ancestor instead of failing.
async function patternContainmentRootForNewPath(pattern: string): Promise<string | null> {
  const { base, rest } = splitGlobPattern(pattern);
  const root = rest && /[*?[\]{}]/.test(rest) ? base : dirname(base);
  if (hasDotDotSegment(root)) return null;
  return realpathNearestExistingAncestor(root);
}

export interface SkillRootTarget {
  agentId: AgentId;
  scope: Scope;
  projectId?: string | null;
}

export type SkillRootResolution =
  | { ok: true; root: string; dest: string }
  | { ok: false; error: string };

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

/**
 * Resolves the on-disk destination directory for installing a skill into the
 * first verified skill root of an agent/scope target.
 */
export async function resolveSkillRootTarget(
  db: Db,
  target: SkillRootTarget,
  skillName: string,
): Promise<SkillRootResolution> {
  const adapter = getAdapter(target.agentId);
  if (!adapter) return { ok: false, error: `Unknown agent: ${target.agentId}` };

  if (!SKILL_NAME_PATTERN.test(skillName) || skillName.includes("/") || skillName.includes("\\")) {
    return { ok: false, error: `Invalid skill name: ${skillName}` };
  }

  const roots = target.scope === "global" ? adapter.globalSkillRoots : adapter.projectSkillRoots;
  const rawRoot = roots[0];
  if (!rawRoot) {
    return { ok: false, error: `Agent ${target.agentId} has no verified skill location` };
  }

  let projectRoot: string | null = null;
  if (target.scope === "project") {
    if (!target.projectId) return { ok: false, error: "projectId is required for project scope" };
    const project = await db.get<ProjectRootRow>("SELECT root_path FROM projects WHERE id = ?", [
      target.projectId,
    ]);
    if (!project) return { ok: false, error: `Project not found: ${target.projectId}` };
    projectRoot = project.root_path;
  }

  const root =
    target.scope === "global"
      ? resolveGlobalPath(rawRoot)
      : resolveProjectPath(projectRoot ?? "", rawRoot);
  const resolvedRoot = await realpathNearestExistingAncestor(root);
  if (!resolvedRoot) return { ok: false, error: `Cannot resolve skill root: ${root}` };

  const dest = join(root, skillName);
  const resolvedDest = join(resolvedRoot, skillName);
  if (!isWithin(resolvedRoot, resolvedDest) || resolvedDest === resolvedRoot) {
    return { ok: false, error: `Skill destination escapes the skill root: ${dest}` };
  }
  return { ok: true, root, dest };
}
