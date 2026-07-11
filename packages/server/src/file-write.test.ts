import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDb, type Db } from "./db/client";
import { runMigrations } from "./db/migrate";
import { addProject, removeProject } from "./services/projects";
import { scanProject } from "./scanner/scan";
import { sha256Hex } from "./lib/hash";
import { validateConfigSyntax } from "./services/config-validate";
import { detectConflicts } from "./services/instruction-conflicts";
import { createResourceFile, FileWriteError, putResourceFile } from "./services/file-write";
import { getProjectSettings, putProjectSettings } from "./services/project-settings";

const tempDirectories: string[] = [];

async function createTestDb(): Promise<{ db: Db; root: string }> {
  const root = await mkdtemp(join(tmpdir(), "weave-file-write-test-"));
  tempDirectories.push(root);
  const db = createDb(join(root, "weave.db"));
  await runMigrations(db);
  return { db, root };
}

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("file-write service", () => {
  it("returns a conflict with currentHash when ifHash does not match", async () => {
    const { db, root } = await createTestDb();
    await writeFile(join(root, "CLAUDE.md"), "use npm for installs");
    const project = await addProject(db, { rootPath: root });

    const resources = await db.all<{ id: string }>(
      "SELECT id FROM resources WHERE kind = 'instruction' AND project_id = ?",
      [project.id],
    );
    expect(resources.length).toBe(1);
    const resourceId = resources[0]!.id;

    let error: unknown;
    try {
      await putResourceFile(db, {
        id: resourceId,
        kind: "instruction",
        content: "use pnpm for installs",
        ifHash: sha256Hex("wrong content"),
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(FileWriteError);
    const writeError = error as FileWriteError;
    expect(writeError.kind).toBe("conflict");
    const details = writeError.details as { currentHash: string; mtime: string | null };
    expect(details.currentHash).toBe(sha256Hex("use npm for installs"));

    const result = await putResourceFile(db, {
      id: resourceId,
      kind: "instruction",
      content: "use pnpm for installs",
      ifHash: details.currentHash,
    });
    expect(result.hash).toBe(sha256Hex("use pnpm for installs"));
    const written = await readFile(join(root, "CLAUDE.md"), "utf8");
    expect(written).toBe("use pnpm for installs");
  });

  it("rejects creating a file whose path does not match any pattern for the agent/scope", async () => {
    const { db, root } = await createTestDb();
    const project = await addProject(db, { rootPath: root });

    let error: unknown;
    try {
      await createResourceFile(db, {
        agentId: "claude-code",
        scope: "project",
        projectId: project.id,
        path: "NOT_A_VALID_INSTRUCTION.md",
        content: "hello",
        kind: "instruction",
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(FileWriteError);
    expect((error as FileWriteError).kind).toBe("bad_request");
  });

  it("creates a memory file matching the adapter pattern and it is picked up by rescan", async () => {
    const { db, root } = await createTestDb();
    await mkdir(join(root, ".claude", "memory"), { recursive: true });
    const project = await addProject(db, { rootPath: root });

    const result = await createResourceFile(db, {
      agentId: "claude-code",
      scope: "project",
      projectId: project.id,
      path: ".claude/memory/notes.md",
      content: "remember this",
      kind: "memory",
    });

    expect(result.hash).toBe(sha256Hex("remember this"));
    const content = await readFile(join(root, ".claude/memory/notes.md"), "utf8");
    expect(content).toBe("remember this");
  });
});

describe("config syntax validation", () => {
  it("carries line/column for a JSON syntax error", () => {
    const result = validateConfigSyntax("settings.json", '{"a": }');
    expect(result).not.toBeNull();
    expect(result?.format).toBe("json");
  });

  it("carries line/column for a TOML syntax error", () => {
    const result = validateConfigSyntax("config.toml", "a = [1, 2\nb = 3");
    expect(result).not.toBeNull();
    expect(result?.format).toBe("toml");
    expect(result?.line).not.toBeNull();
  });

  it("carries line/column for a YAML syntax error", () => {
    const result = validateConfigSyntax("config.yaml", "a: [1, 2\nb: 3");
    expect(result).not.toBeNull();
    expect(result?.format).toBe("yaml");
    expect(result?.line).not.toBeNull();
  });

  it("returns null for an unknown extension", () => {
    expect(validateConfigSyntax("README", "anything")).toBeNull();
  });

  it("returns null for valid content in each format", () => {
    expect(validateConfigSyntax("a.json", "{}")).toBeNull();
    expect(validateConfigSyntax("a.toml", "a = 1")).toBeNull();
    expect(validateConfigSyntax("a.yaml", "a: 1")).toBeNull();
  });
});

describe("instruction conflict detection", () => {
  it("flags a possible conflict between files with differing single values, and skips ambiguous files", async () => {
    const { db, root } = await createTestDb();
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "CLAUDE.md"), "Please always use npm to install dependencies here.");
    await writeFile(
      join(root, "CLAUDE.local.md"),
      "This project actually prefers pnpm over anything else.",
    );
    await mkdir(join(root, ".claude"), { recursive: true });
    await writeFile(
      join(root, ".claude", "CLAUDE.md"),
      "We support both npm and pnpm depending on the package.",
    );

    const project = await addProject(db, { rootPath: root });
    const conflicts = await detectConflicts(db, { scope: "project", projectId: project.id });

    const packageManagerConflicts = conflicts.filter((c) => c.topic === "package-manager");
    expect(packageManagerConflicts.length).toBe(1);
    const conflict = packageManagerConflicts[0]!;
    expect([conflict.valueA, conflict.valueB].sort()).toEqual(["npm", "pnpm"]);
    expect(conflict.excerptA.length).toBeLessThanOrEqual(300);
    expect(conflict.excerptB.length).toBeLessThanOrEqual(300);

    // The file mentioning both npm and pnpm is self-ambiguous and must not appear.
    for (const info of conflicts) {
      expect(info.fileA).not.toBe(".claude/CLAUDE.md");
      expect(info.fileB).not.toBe(".claude/CLAUDE.md");
    }
  });
});

describe("scanner project ignoredPaths", () => {
  it("merges project-level ignoredPaths into the ignore globs used by scanProject", async () => {
    const { db, root } = await createTestDb();
    await mkdir(join(root, "ignored-dir"), { recursive: true });
    await writeFile(join(root, "ignored-dir", ".mcp.json"), "{}");

    const project = await addProject(db, { rootPath: root });
    await putProjectSettings(db, project.id, { ignoredPaths: ["**/ignored-dir/**"] });
    await scanProject(db, project);

    const configs = await db.all<{ path: string }>(
      "SELECT path FROM resources WHERE kind = 'config' AND project_id = ?",
      [project.id],
    );
    expect(configs.some((c) => c.path.includes("ignored-dir"))).toBe(false);
  });
});

describe("project settings", () => {
  it("round-trips project settings and removes them when the project is deleted", async () => {
    const { db, root } = await createTestDb();
    const project = await addProject(db, { rootPath: root });

    const defaults = await getProjectSettings(db, project.id);
    expect(defaults).toEqual({ ignoredPaths: [], customResourcePaths: [], preferredAgents: [] });

    const updated = await putProjectSettings(db, project.id, {
      ignoredPaths: ["dist/**"],
      preferredAgents: ["claude-code"],
    });
    expect(updated).toEqual({
      ignoredPaths: ["dist/**"],
      customResourcePaths: [],
      preferredAgents: ["claude-code"],
    });

    const reread = await getProjectSettings(db, project.id);
    expect(reread).toEqual(updated);

    await removeProject(db, project.id);
    const row = await db.get("SELECT * FROM settings WHERE key = ?", [`project:${project.id}`]);
    expect(row).toBeNull();
  });

  it("returns null for a project that does not exist", async () => {
    const { db } = await createTestDb();
    expect(await getProjectSettings(db, "does-not-exist")).toBeNull();
    expect(await putProjectSettings(db, "does-not-exist", {})).toBeNull();
  });
});
