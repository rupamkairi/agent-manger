import type { AgentAdapter } from "./types";

export const claudeCodeAdapter: AgentAdapter = {
  id: "claude-code",
  name: "Claude Code",
  binaryCandidates: ["claude"],
  versionCommand: ["claude", "--version"],
  globalConfigPaths: ["~/.claude/settings.json", "~/.claude.json"],
  projectConfigPaths: [".claude/settings.json", ".claude/settings.local.json", ".mcp.json"],
  globalSkillRoots: ["~/.claude/skills"],
  projectSkillRoots: [".claude/skills"],
  instructionFilePatterns: {
    global: ["~/.claude/CLAUDE.md"],
    project: ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md"],
  },
  memoryPatterns: {
    global: ["~/.claude/memory/**"],
    project: [".claude/memory/**"],
  },
  supportedCommands: ["claude"],
};
