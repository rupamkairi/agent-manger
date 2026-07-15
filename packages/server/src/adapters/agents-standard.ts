import type { SkillSource } from "./types";

/**
 * Agent-agnostic skills standard used by `npx skills add`: real skill
 * directories live under `.agents/skills` and are symlinked into individual
 * agent skill roots.
 */
export const agentsStandardSource: SkillSource = {
  id: "shared",
  name: "Shared",
  globalSkillRoots: ["~/.agents/skills"],
  projectSkillRoots: [".agents/skills"],
};
