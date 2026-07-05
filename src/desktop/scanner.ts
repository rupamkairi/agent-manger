import type {
  AgentId,
  ResourceCandidate,
  ResourceScope,
  ValidationStatus,
} from "../shared/types/resource.ts";

export interface SkillManifestValidation {
  status: ValidationStatus;
  issues: string[];
}

export type SkillRootCandidate = Omit<ResourceCandidate, "path" | "type"> & { path: string };
const DEBUG_PREFIX = "[DEBUG-skillscan]";

const PROJECT_RESOURCE_PATTERNS: Array<Omit<ResourceCandidate, "path"> & { path: string }> = [
  { agent: "claude", type: "instruction", scope: "project", path: "CLAUDE.md" },
  { agent: "claude", type: "instruction", scope: "project", path: "CLAUDE.local.md" },
  { agent: "claude", type: "instruction", scope: "project", path: ".claude/CLAUDE.md" },
  { agent: "claude", type: "config", scope: "project", path: ".claude/settings.json" },
  { agent: "claude", type: "config", scope: "project", path: ".claude/settings.local.json" },
  { agent: "codex", type: "instruction", scope: "project", path: "AGENTS.md" },
  { agent: "codex", type: "instruction", scope: "project", path: "AGENTS.override.md" },
  { agent: "opencode", type: "config", scope: "project", path: "opencode.json" },
  { agent: "opencode", type: "config", scope: "project", path: "opencode.jsonc" },
  { agent: "opencode", type: "config", scope: "project", path: ".opencode" },
];

const PROJECT_SKILL_ROOT_PATTERNS: SkillRootCandidate[] = [
  { agent: "claude", scope: "project", path: ".claude/skills" },
  { agent: "codex", scope: "project", path: ".codex/skills" },
  { agent: "codex", scope: "shared", path: ".agents/skills" },
  { agent: "opencode", scope: "project", path: ".opencode/skills" },
  { agent: "opencode", scope: "shared", path: ".agents/skills" },
  { agent: "opencode", scope: "shared", path: ".claude/skills" },
];

const GLOBAL_SKILL_ROOT_PATTERNS: SkillRootCandidate[] = [
  { agent: "claude", scope: "global", path: ".claude/skills" },
  { agent: "codex", scope: "global", path: ".codex/skills" },
  { agent: "codex", scope: "shared", path: ".agents/skills" },
  { agent: "opencode", scope: "global", path: ".config/opencode/skills" },
  { agent: "opencode", scope: "global", path: ".opencode/skills" },
  { agent: "opencode", scope: "shared", path: ".agents/skills" },
];

export function getProjectResourceCandidates(projectPath: string): ResourceCandidate[] {
  return PROJECT_RESOURCE_PATTERNS.map((candidate) => ({
    ...candidate,
    path: joinPath(projectPath, candidate.path),
  }));
}

export function detectAgentForInstructionPath(path: string): AgentId | "unknown" {
  const normalized = path.replaceAll("\\", "/");

  if (normalized.endsWith("CLAUDE.md") || normalized.includes("/.claude/")) {
    return "claude";
  }

  if (normalized.endsWith("AGENTS.md") || normalized.endsWith("AGENTS.override.md") || normalized.includes("/.codex/")) {
    return "codex";
  }

  if (normalized.endsWith("opencode.json") || normalized.endsWith("opencode.jsonc") || normalized.includes("/.opencode/")) {
    return "opencode";
  }

  return "unknown";
}

export function validateSkillManifest(content: string): SkillManifestValidation {
  const trimmed = content.trim();
  const issues: string[] = [];

  if (!trimmed) {
    return { status: "invalid", issues: ["SKILL.md is empty"] };
  }

  if (!/^#\s+.+/m.test(trimmed)) {
    issues.push("Missing top-level skill name heading");
  }

  if (!/description\s*:/i.test(trimmed)) {
    issues.push("Missing skill description metadata");
  }

  if (issues.length > 0) {
    return { status: "warning", issues };
  }

  return { status: "valid", issues };
}

export function extractSkillDescription(content: string) {
  const explicit = content.match(/^\s*description\s*:\s*(.+)\s*$/im)?.[1]?.trim();

  if (explicit) {
    return explicit;
  }

  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

export function extractSkillName(content: string, fallback = "") {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

export async function scanProjectPaths(projectPath: string): Promise<ResourceCandidate[]> {
  debugLog(`scanProjectPaths:start project=${projectPath}`);
  const candidates = getProjectResourceCandidates(projectPath);
  const found: ResourceCandidate[] = [];

  for (const candidate of candidates) {
    if (await pathExists(candidate.path)) {
      debugLog(`project-resource:found type=${candidate.type} agent=${candidate.agent} path=${candidate.path}`);
      found.push(candidate);
    }
  }

  found.push(...await scanSkillRoots(getProjectSkillRoots(projectPath)));
  debugLog(`scanProjectPaths:done project=${projectPath} total=${found.length}`);

  return found;
}

export async function scanGlobalSkillPaths(home = Deno.env.get("HOME") ?? ""): Promise<ResourceCandidate[]> {
  if (!home.trim()) {
    debugLog("scanGlobalSkillPaths:skip missing-home");
    return [];
  }

  debugLog(`scanGlobalSkillPaths:start home=${home}`);
  const found = await scanSkillRoots(getGlobalSkillRoots(home));
  debugLog(`scanGlobalSkillPaths:done home=${home} total=${found.length}`);
  return found;
}

export function getProjectSkillRoots(projectPath: string): SkillRootCandidate[] {
  return PROJECT_SKILL_ROOT_PATTERNS.map((pattern) => ({
    ...pattern,
    path: joinPath(projectPath, pattern.path),
  }));
}

export function getGlobalSkillRoots(home: string): SkillRootCandidate[] {
  return GLOBAL_SKILL_ROOT_PATTERNS.map((pattern) => ({
    ...pattern,
    path: joinPath(home, pattern.path),
  }));
}

function joinPath(base: string, child: string) {
  return `${base.replace(/\/$/, "")}/${child}`;
}

export async function scanSkillRoots(roots: SkillRootCandidate[]) {
  const found: ResourceCandidate[] = [];

  for (const root of roots) {
    const exists = await pathExists(root.path);

    debugLog(
      `root-check root=${root.path} agent=${root.agent} scope=${root.scope} exists=${exists ? "yes" : "no"}`,
    );

    if (!exists) {
      continue;
    }

    for await (const entry of Deno.readDir(root.path)) {
      if (!entry.isDirectory) {
        continue;
      }

      const entryPath = joinPath(root.path, entry.name);
      debugLog(`root-entry agent=${root.agent} scope=${root.scope} path=${entryPath}`);
      found.push({
        agent: root.agent,
        type: "skill-folder",
        scope: root.scope as ResourceScope,
        path: entryPath,
      });
    }
  }

  return found;
}

function debugLog(message: string) {
  console.log(`${DEBUG_PREFIX} ${message}`);
}
