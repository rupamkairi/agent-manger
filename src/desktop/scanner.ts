import type {
  AgentId,
  ResourceCandidate,
  ValidationStatus,
} from "../shared/types/resource.ts";

export interface SkillManifestValidation {
  status: ValidationStatus;
  issues: string[];
}

const PROJECT_RESOURCE_PATTERNS: Array<Omit<ResourceCandidate, "path"> & { path: string }> = [
  { agent: "claude", type: "instruction", scope: "project", path: "CLAUDE.md" },
  { agent: "claude", type: "instruction", scope: "project", path: "CLAUDE.local.md" },
  { agent: "claude", type: "instruction", scope: "project", path: ".claude/CLAUDE.md" },
  { agent: "claude", type: "config", scope: "project", path: ".claude/settings.json" },
  { agent: "claude", type: "config", scope: "project", path: ".claude/settings.local.json" },
  { agent: "claude", type: "skill-folder", scope: "project", path: ".claude/skills" },
  { agent: "codex", type: "instruction", scope: "project", path: "AGENTS.md" },
  { agent: "codex", type: "instruction", scope: "project", path: "AGENTS.override.md" },
  { agent: "codex", type: "skill-folder", scope: "project", path: ".codex/skills" },
  { agent: "codex", type: "skill-folder", scope: "shared", path: ".agents/skills" },
  { agent: "opencode", type: "config", scope: "project", path: "opencode.json" },
  { agent: "opencode", type: "config", scope: "project", path: "opencode.jsonc" },
  { agent: "opencode", type: "config", scope: "project", path: ".opencode" },
  { agent: "opencode", type: "skill-folder", scope: "project", path: ".opencode/skills" },
  { agent: "opencode", type: "skill-folder", scope: "shared", path: ".agents/skills" },
  { agent: "opencode", type: "skill-folder", scope: "shared", path: ".claude/skills" },
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
  const candidates = getProjectResourceCandidates(projectPath);
  const found: ResourceCandidate[] = [];

  for (const candidate of candidates) {
    if (await pathExists(candidate.path)) {
      found.push(candidate);
    }
  }

  return found;
}

function joinPath(base: string, child: string) {
  return `${base.replace(/\/$/, "")}/${child}`;
}
