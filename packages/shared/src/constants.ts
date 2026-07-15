export const AGENT_IDS = ["claude-code", "codex", "opencode"] as const;
/** Agent-agnostic skill source (`~/.agents/skills`, `.agents/skills` — the `npx skills add` standard). */
export const SHARED_SOURCE_ID = "shared" as const;
export const SKILL_SOURCE_IDS = [...AGENT_IDS, SHARED_SOURCE_ID] as const;
export const RESOURCE_KINDS = ["skill", "instruction", "memory", "config"] as const;
export const SCOPES = ["global", "project"] as const;

export type AgentId = (typeof AGENT_IDS)[number];
export type SkillSourceId = (typeof SKILL_SOURCE_IDS)[number];
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type Scope = (typeof SCOPES)[number];

export const SKILL_SOURCE_LABELS: Record<SkillSourceId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  opencode: "opencode",
  shared: "Shared",
};

export interface AdapterFileRules {
  instructionFiles: {
    global: string[];
    project: string[];
  };
  /** Base directories the user names a new memory file under (not glob patterns). */
  memoryDirs: {
    global: string[];
    project: string[];
  };
  hasSkillRoots: boolean;
}

/**
 * Verified per-agent write targets, mirrored from the server adapter
 * definitions so the UI can offer valid filenames without an extra endpoint.
 */
export const ADAPTER_FILE_RULES: Record<AgentId, AdapterFileRules> = {
  "claude-code": {
    instructionFiles: {
      global: ["~/.claude/CLAUDE.md"],
      project: ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md"],
    },
    memoryDirs: {
      global: ["~/.claude/memory"],
      project: [".claude/memory"],
    },
    hasSkillRoots: true,
  },
  codex: {
    instructionFiles: {
      global: ["~/.codex/AGENTS.md"],
      project: ["AGENTS.md"],
    },
    memoryDirs: {
      global: [],
      project: [],
    },
    hasSkillRoots: true,
  },
  opencode: {
    instructionFiles: {
      global: ["~/.config/opencode/AGENTS.md"],
      project: ["AGENTS.md"],
    },
    memoryDirs: {
      global: [],
      project: [],
    },
    hasSkillRoots: true,
  },
};
