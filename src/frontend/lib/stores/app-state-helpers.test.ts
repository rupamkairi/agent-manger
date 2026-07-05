import type { PersistedAppState, Project, Skill } from "../../../shared/types/resource.ts";
import {
  describeSkillsEmptyState,
  filterSkillsForTab,
  findProjectById,
  resolveSelectedProjectId,
  resolveSelectedSkillId,
  restoreProjects,
} from "./app-state-helpers.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

const projects: Project[] = [
  {
    id: "p-1",
    name: "One",
    path: "/tmp/one",
    environment: "local",
    lastScanned: "2026-07-06 10:00:00",
    agentCount: 0,
    skillCount: 0,
    instructionCount: 0,
    warningCount: 0,
  },
  {
    id: "p-2",
    name: "Two",
    path: "/tmp/two",
    environment: "local",
    lastScanned: "2026-07-06 10:05:00",
    agentCount: 0,
    skillCount: 0,
    instructionCount: 0,
    warningCount: 0,
  },
];

const skills: Skill[] = [
  {
    id: "g-1",
    name: "Global One",
    description: "Global",
    scope: "global",
    agentTarget: "codex",
    location: "/Users/test/.codex/skills/global-one/SKILL.md",
    sourceProjectId: null,
    status: "valid",
    duplicateName: false,
  },
  {
    id: "p-1-skill",
    name: "Project One Skill",
    description: "Project",
    scope: "project",
    agentTarget: "codex",
    location: "/tmp/one/.codex/skills/project-one/SKILL.md",
    sourceProjectId: "p-1",
    status: "valid",
    duplicateName: false,
  },
  {
    id: "p-2-skill",
    name: "Project Two Skill",
    description: "Project",
    scope: "shared",
    agentTarget: "codex",
    location: "/tmp/two/.agents/skills/project-two/SKILL.md",
    sourceProjectId: "p-2",
    status: "valid",
    duplicateName: false,
  },
];

Deno.test("restoreProjects restores cached projects and selected project", () => {
  const state: PersistedAppState = {
    version: 1,
    selectedProjectId: "p-2",
    projects: projects.map(({ id, name, path, lastScanned }) => ({ id, name, path, lastScanned })),
  };

  const restored = restoreProjects(state);

  assertEquals(restored.projects.length, 2);
  assertEquals(restored.selectedProjectId, "p-2");
  assertEquals(restored.projects[1]?.name, "Two");
});

Deno.test("restoreProjects falls back to the first project when saved selection is invalid", () => {
  const state: PersistedAppState = {
    version: 1,
    selectedProjectId: "missing",
    projects: projects.map(({ id, name, path, lastScanned }) => ({ id, name, path, lastScanned })),
  };

  const restored = restoreProjects(state);

  assertEquals(restored.selectedProjectId, "p-1");
});

Deno.test("resolveSelectedProjectId falls back to the first project when selection is invalid", () => {
  assertEquals(resolveSelectedProjectId("missing", projects), "p-1");
});

Deno.test("findProjectById returns the currently selected project", () => {
  assertEquals(findProjectById(projects, "p-2")?.path, "/tmp/two");
});

Deno.test("filterSkillsForTab returns all skills for All tab", () => {
  assertEquals(filterSkillsForTab(skills, "All", "p-1").length, 3);
});

Deno.test("filterSkillsForTab returns only global skills for Global tab", () => {
  assertEquals(filterSkillsForTab(skills, "Global", "p-1")[0]?.id, "g-1");
});

Deno.test("filterSkillsForTab returns only selected project owned skills for Project tab", () => {
  const filtered = filterSkillsForTab(skills, "Project", "p-2");

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0]?.id, "p-2-skill");
});

Deno.test("resolveSelectedSkillId preserves selected skill when still visible", () => {
  assertEquals(resolveSelectedSkillId(skills, "p-1-skill"), "p-1-skill");
});

Deno.test("resolveSelectedSkillId falls back to first visible skill when selection disappears", () => {
  assertEquals(resolveSelectedSkillId(skills.slice(1), "g-1"), "p-1-skill");
});

Deno.test("describeSkillsEmptyState surfaces diagnostic warning when scan is blocked", () => {
  const emptyState = describeSkillsEmptyState([], [], "All", [{
    id: "warn-1",
    category: "permission-denied",
    severity: "warning",
    resource: "Global Skills",
    reason: "Read access denied for skill root /Users/test/.codex/skills.",
    suggestedFix: "Allow read access and rescan.",
    time: "local",
  }]);

  assertEquals(emptyState.title, "Skill scan blocked");
});

Deno.test("describeSkillsEmptyState keeps selected-project wording for empty Project tab", () => {
  const emptyState = describeSkillsEmptyState(skills, [], "Project", []);

  assertEquals(emptyState.title, "No project skills for selected project");
});
