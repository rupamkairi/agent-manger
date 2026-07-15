import type { AgentAdapter } from "./types";

export const opencodeAdapter: AgentAdapter = {
  id: "opencode",
  name: "opencode",
  binaryCandidates: ["opencode"],
  versionCommand: ["opencode", "--version"],
  globalConfigPaths: ["~/.config/opencode/opencode.json"],
  projectConfigPaths: ["opencode.json", ".opencode/opencode.json"],
  globalSkillRoots: ["~/.config/opencode/skill", "~/.config/opencode/skills"],
  projectSkillRoots: [".opencode/skill", ".opencode/skills"],
  instructionFilePatterns: {
    global: ["~/.config/opencode/AGENTS.md"],
    project: ["AGENTS.md"],
  },
  memoryPatterns: {
    global: [],
    project: [],
  },
  supportedCommands: ["opencode"],
};
