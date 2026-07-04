import {
  detectAgentForInstructionPath,
  getProjectResourceCandidates,
  validateSkillManifest,
} from "./scanner.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("project resource candidates exclude Pi and include Claude Codex OpenCode", () => {
  const candidates = getProjectResourceCandidates("/repo");

  assertEquals(candidates.some((candidate) => String(candidate.agent) === "pi"), false);
  assertEquals(candidates.some((candidate) => candidate.path === "/repo/CLAUDE.md"), true);
  assertEquals(candidates.some((candidate) => candidate.path === "/repo/AGENTS.md"), true);
  assertEquals(candidates.some((candidate) => candidate.path === "/repo/opencode.json"), true);
});

Deno.test("instruction path maps to verified in-scope agent", () => {
  assertEquals(detectAgentForInstructionPath("/repo/.claude/settings.json"), "claude");
  assertEquals(detectAgentForInstructionPath("/repo/AGENTS.md"), "codex");
  assertEquals(detectAgentForInstructionPath("/repo/.opencode/config.json"), "opencode");
  assertEquals(detectAgentForInstructionPath("/repo/.cursor/rules/main.mdc"), "unknown");
});

Deno.test("skill manifest validation requires name and description", () => {
  assertEquals(validateSkillManifest("# planner\n\n---\ndescription: Plans work\n---").status, "valid");
  assertEquals(validateSkillManifest("# planner").status, "warning");
  assertEquals(validateSkillManifest("").status, "invalid");
});
