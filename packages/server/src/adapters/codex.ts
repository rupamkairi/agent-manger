import type { AgentAdapter } from "./types";

export const codexAdapter: AgentAdapter = {
  id: "codex",
  name: "Codex",
  binaryCandidates: ["codex"],
  versionCommand: ["codex", "--version"],
  globalConfigPaths: ["~/.codex/config.toml"],
  projectConfigPaths: [],
  globalSkillRoots: [],
  projectSkillRoots: [],
  instructionFilePatterns: {
    global: ["~/.codex/AGENTS.md"],
    project: ["AGENTS.md"],
  },
  memoryPatterns: {
    global: [],
    project: [],
  },
  supportedCommands: ["codex"],
};
