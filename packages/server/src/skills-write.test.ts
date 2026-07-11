import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDb, type Db } from "./db/client";
import { runMigrations } from "./db/migrate";
import { hashDir } from "./lib/hash";
import { deleteSkillCopy, installSkillFromDir } from "./services/skill-write";
import { cleanupStaging, loadSkill, SkillImportError } from "./services/skill-import";

const tempDirectories: string[] = [];

async function createTestDb(): Promise<{ db: Db; root: string }> {
  const root = await mkdtemp(join(tmpdir(), "weave-skills-write-test-"));
  tempDirectories.push(root);
  const db = createDb(join(root, "weave.db"));
  await runMigrations(db);
  return { db, root };
}

async function writeSkillDir(root: string, name = "demo"): Promise<string> {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), "---\nname: demo\ndescription: Demo skill\n---\nBody\n");
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("skill-write", () => {
  it("reports a per-target error when the agent has no verified skill location", async () => {
    const { db, root } = await createTestDb();
    const sourceDir = await writeSkillDir(root, "source");

    const response = await installSkillFromDir(db, {
      sourceDir,
      skillName: "demo",
      targets: [{ agentId: "codex", scope: "global" }],
      source: { kind: "test" },
    });

    expect(response.rescanned).toBe(false);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.ok).toBe(false);
    expect(response.results[0]?.error).toMatch(/no verified skill location/i);
  });

  it("installs into claude-code's project skill root and records an audit row", async () => {
    const { db, root } = await createTestDb();
    const sourceDir = await writeSkillDir(root, "source");
    await db.run("INSERT INTO projects (id, name, root_path, added_at) VALUES (?, ?, ?, ?)", [
      "project-1",
      "Test",
      root,
      new Date().toISOString(),
    ]);

    const response = await installSkillFromDir(db, {
      sourceDir,
      skillName: "demo",
      targets: [{ agentId: "claude-code", scope: "project", projectId: "project-1" }],
      source: { kind: "test" },
    });

    expect(response.rescanned).toBe(true);
    expect(response.results[0]?.ok).toBe(true);
    const installedPath = response.results[0]?.installedPath;
    expect(installedPath).toBeTruthy();
    const content = await readFile(join(installedPath!, "SKILL.md"), "utf8");
    expect(content).toContain("name: demo");

    const auditRow = await db.get<{ skill_name: string; content_hash: string }>(
      "SELECT skill_name, content_hash FROM skill_installs WHERE skill_name = ?",
      ["demo"],
    );
    expect(auditRow?.skill_name).toBe("demo");
    expect(auditRow?.content_hash).toBeTruthy();
  });

  it("refuses to delete a target outside the recomputed skill root", async () => {
    const { db, root } = await createTestDb();
    await db.run("INSERT INTO projects (id, name, root_path, added_at) VALUES (?, ?, ?, ?)", [
      "project-1",
      "Test",
      root,
      new Date().toISOString(),
    ]);

    const outsidePath = join(root, "..", `weave-outside-${crypto.randomUUID()}`);
    await mkdir(outsidePath, { recursive: true });
    await writeFile(join(outsidePath, "SKILL.md"), "---\nname: evil\n---\n");

    await db.run(
      `INSERT INTO resources
        (id, kind, path, original_path, scope, project_id, agent_id, size_bytes, mtime, last_scanned_at, meta_json)
       VALUES (?, 'skill', ?, ?, 'project', ?, 'claude-code', NULL, NULL, ?, ?)`,
      [
        "resource-1",
        outsidePath,
        outsidePath,
        "project-1",
        new Date().toISOString(),
        JSON.stringify({ skill: { name: "evil", description: null, dirName: "evil", status: "valid", files: [] } }),
      ],
    );

    const outcome = await deleteSkillCopy(db, "resource-1");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe("bad_request");
    }

    await rm(outsidePath, { recursive: true, force: true });
  });
});

describe("hashDir", () => {
  it("is deterministic regardless of traversal order and content changes affect the hash", async () => {
    const root = await mkdtemp(join(tmpdir(), "weave-hashdir-test-"));
    tempDirectories.push(root);
    await mkdir(join(root, "a"), { recursive: true });
    await mkdir(join(root, "b"), { recursive: true });
    await writeFile(join(root, "a", "one.txt"), "one");
    await writeFile(join(root, "b", "two.txt"), "two");

    const first = await hashDir(root);
    const second = await hashDir(root);
    expect(first.dirHash).toBe(second.dirHash);
    expect(first.files.size).toBe(2);

    await writeFile(join(root, "a", "one.txt"), "changed");
    const third = await hashDir(root);
    expect(third.dirHash).not.toBe(first.dirHash);
  });
});

describe("skill-import staging", () => {
  it("rejects a zip-slip entry", async () => {
    const { db } = await createTestDb();
    const stagingRoot = await mkdtemp(join(tmpdir(), "weave-staging-test-"));
    tempDirectories.push(stagingRoot);

    const zipDir = await mkdtemp(join(tmpdir(), "weave-zip-source-"));
    tempDirectories.push(zipDir);

    const { zipSync } = await import("fflate");
    const zipPath = join(zipDir, "evil.zip");
    const archive = zipSync({
      "SKILL.md": new TextEncoder().encode("---\nname: evil\ndescription: Evil\n---\n"),
      "../../etc/evil.txt": new TextEncoder().encode("owned"),
    });
    await writeFile(zipPath, archive);

    await expect(
      loadSkill(db, { kind: "zip", path: zipPath }, { stagingRoot }),
    ).rejects.toBeInstanceOf(SkillImportError);
  });

  it("removes expired staging directories on cleanup", async () => {
    const stagingRoot = await mkdtemp(join(tmpdir(), "weave-staging-ttl-test-"));
    tempDirectories.push(stagingRoot);

    const expiredDir = join(stagingRoot, "expired-id");
    await mkdir(join(expiredDir, "skill"), { recursive: true });
    await writeFile(
      join(expiredDir, "meta.json"),
      JSON.stringify({
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        source: { kind: "localFolder", path: "/tmp/whatever" },
        skillName: "expired",
      }),
    );

    const freshDir = join(stagingRoot, "fresh-id");
    await mkdir(join(freshDir, "skill"), { recursive: true });
    await writeFile(
      join(freshDir, "meta.json"),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        source: { kind: "localFolder", path: "/tmp/whatever" },
        skillName: "fresh",
      }),
    );

    await cleanupStaging({ stagingRoot });

    const remaining = await readFile(join(freshDir, "meta.json"), "utf8").catch(() => null);
    expect(remaining).not.toBeNull();
    const expiredStillExists = await readFile(join(expiredDir, "meta.json"), "utf8").catch(() => null);
    expect(expiredStillExists).toBeNull();
  });
});
