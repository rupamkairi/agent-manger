import { bindDesktopApi, desktopApi } from "./api.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("bindDesktopApi registers desktop methods on the window", () => {
  const bound = new Map<string, unknown>();
  const win = {
    bind(name: string, handler: unknown) {
      bound.set(name, handler);
    },
  };

  bindDesktopApi(win, desktopApi);

  assertEquals(typeof bound.get("pickProjectFolder"), "function");
  assertEquals(typeof bound.get("loadAppState"), "function");
  assertEquals(typeof bound.get("terminalEnsureStarted"), "function");
});

Deno.test("scanProject tags discovered skills with owning project id", async () => {
  const projectDir = await Deno.makeTempDir();
  const skillDir = `${projectDir}/.codex/skills/project-skill`;

  try {
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(
      `${skillDir}/SKILL.md`,
      [
        "---",
        "description: Project scoped skill",
        "---",
        "",
        "# Project Skill",
      ].join("\n"),
    );

    const snapshot = await desktopApi.scanProject(projectDir);
    const projectId = snapshot.projects[0]?.id;

    assertEquals(snapshot.skills.length, 1);
    assertEquals(snapshot.skills[0]?.sourceProjectId, projectId ?? null);
  } finally {
    await Deno.remove(projectDir, { recursive: true });
  }
});

Deno.test("scanGlobalSkills leaves discovered skills detached from a project", async () => {
  const homeDir = await Deno.makeTempDir();
  const skillDir = `${homeDir}/.codex/skills/global-skill`;

  try {
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(
      `${skillDir}/SKILL.md`,
      [
        "---",
        "description: Global scoped skill",
        "---",
        "",
        "# Global Skill",
      ].join("\n"),
    );

    const snapshot = await desktopApi.scanGlobalSkills(homeDir);

    assertEquals(snapshot.skills.length, 1);
    assertEquals(snapshot.skills[0]?.sourceProjectId, null);
  } finally {
    await Deno.remove(homeDir, { recursive: true });
  }
});

Deno.test("scanGlobalSkills returns root-missing warning when no global roots exist", async () => {
  const homeDir = await Deno.makeTempDir();

  try {
    const snapshot = await desktopApi.scanGlobalSkills(homeDir);
    const warning = snapshot.warnings.find((entry) => entry.category === "root-missing");

    assertEquals(snapshot.skills.length, 0);
    assertEquals(warning?.category, "root-missing");
  } finally {
    await Deno.remove(homeDir, { recursive: true });
  }
});

Deno.test("scanProject returns root-missing warning when no project skill roots exist", async () => {
  const projectDir = await Deno.makeTempDir();

  try {
    const snapshot = await desktopApi.scanProject(projectDir);
    const warning = snapshot.warnings.find((entry) => entry.category === "root-missing");

    assertEquals(snapshot.skills.length, 0);
    assertEquals(warning?.category, "root-missing");
  } finally {
    await Deno.remove(projectDir, { recursive: true });
  }
});
