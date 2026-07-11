import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getAgentInfo, getAgentInfos } from "./services/agents";
import { getHealthSummary } from "./services/health";
import { getResourceContent } from "./services/resources";
import { runMigrations } from "./db/migrate";
import { createDb, type Db } from "./db/client";
import { claudeCodeAdapter } from "./adapters/claude-code";
import { scanSkillRoot } from "./scanner/skills";
import { ValidationError, validateScopeSelection } from "./http/validate";

const tempDirectories: string[] = [];

async function createTestDb(): Promise<{ db: Db; root: string }> {
  const root = await mkdtemp(join(tmpdir(), "weave-backend-test-"));
  tempDirectories.push(root);
  const db = createDb(join(root, "weave.db"));
  await runMigrations(db);
  return { db, root };
}

async function insertResource(
  db: Db,
  input: {
    id: string;
    kind: "skill" | "instruction" | "memory" | "config";
    path: string;
    originalPath?: string;
    scope: "global" | "project";
    projectId?: string | null;
    agentId?: "claude-code" | "codex" | "opencode";
  },
): Promise<void> {
  await db.run(
    `INSERT INTO resources
      (id, kind, path, original_path, scope, project_id, agent_id, size_bytes, mtime, last_scanned_at, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.kind,
      input.path,
      input.originalPath ?? input.path,
      input.scope,
      input.projectId ?? null,
      input.agentId ?? "claude-code",
      null,
      null,
      new Date().toISOString(),
      "{}",
    ],
  );
}

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("backend audit completion", () => {
  it("reads only supported, contained resources and truncates large previews", async () => {
    const { db, root } = await createTestDb();
    const filePath = join(root, "CLAUDE.md");
    await writeFile(filePath, "hello");
    await db.run("INSERT INTO projects (id, name, root_path, added_at) VALUES (?, ?, ?, ?)", [
      "project-1",
      "Test",
      root,
      new Date().toISOString(),
    ]);
    await insertResource(db, {
      id: "resource-1",
      kind: "instruction",
      path: filePath,
      scope: "project",
      projectId: "project-1",
    });

    const content = await getResourceContent(db, "resource-1");
    expect(content?.content).toBe("hello");
    expect(content?.truncated).toBe(false);

    await writeFile(filePath, Buffer.alloc(256 * 1024 + 1, "a"));
    const truncated = await getResourceContent(db, "resource-1");
    expect(truncated?.truncated).toBe(true);
    expect(new TextEncoder().encode(truncated?.content ?? "").byteLength).toBe(256 * 1024);

    const outsidePath = join(root, "..", `weave-outside-${crypto.randomUUID()}.txt`);
    await writeFile(outsidePath, "outside");
    await rm(filePath);
    await symlink(outsidePath, filePath);
    expect(await getResourceContent(db, "resource-1")).toBeNull();
    await rm(outsidePath, { force: true });
  });

	it("returns resource counts for the requested scope", async () => {
    const { db, root } = await createTestDb();
    await db.run("INSERT INTO projects (id, name, root_path, added_at) VALUES (?, ?, ?, ?)", [
      "project-1",
      "Test",
      root,
      new Date().toISOString(),
    ]);
    await insertResource(db, { id: "global-skill", kind: "skill", path: "/tmp/global-skill", scope: "global" });
    await insertResource(db, {
      id: "project-instruction",
      kind: "instruction",
      path: join(root, "CLAUDE.md"),
      scope: "project",
      projectId: "project-1",
    });
    await insertResource(db, {
      id: "project-config",
      kind: "config",
      path: join(root, "config.json"),
      scope: "project",
      projectId: "project-1",
    });

    const global = await getAgentInfos(db);
    const project = await getAgentInfos(db, { scope: "project", projectId: "project-1" });
    expect(global.find((agent) => agent.id === "claude-code")?.resourceCounts).toEqual({
      skills: 1,
      instructions: 0,
      memory: 0,
      configs: 0,
    });
		expect(project.find((agent) => agent.id === "claude-code")?.resourceCounts).toEqual({
      skills: 0,
      instructions: 1,
      memory: 0,
      configs: 1,
		});
		const projectDetail = await getAgentInfo(db, "claude-code", {
			scope: "project",
			projectId: "project-1",
		});
		expect(projectDetail?.resourceCounts).toEqual({
			skills: 0,
			instructions: 1,
			memory: 0,
			configs: 1,
		});
	});

	it("requires a project id only for project-scoped requests", () => {
		expect(validateScopeSelection({})).toEqual({ scope: "global" });
		expect(validateScopeSelection({ scope: "project", projectId: "project-1" })).toEqual({
			scope: "project",
			projectId: "project-1",
		});
		expect(() => validateScopeSelection({ scope: "project" })).toThrow(ValidationError);
		expect(() => validateScopeSelection({ scope: "global", projectId: "project-1" })).toThrow(
			ValidationError,
		);
	});

  it("keeps machine detection issues in both health scopes", async () => {
    const { db, root } = await createTestDb();
    await db.run("INSERT INTO projects (id, name, root_path, added_at, last_scanned_at) VALUES (?, ?, ?, ?, ?)", [
      "project-1",
      "Test",
      root,
      new Date().toISOString(),
      new Date().toISOString(),
    ]);
    await db.run(
      "INSERT INTO agent_detections (agent_id, state, binary_path, version, error, detected_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["codex", "missing", null, null, null, new Date().toISOString()],
    );
    await insertResource(db, { id: "global-skill", kind: "skill", path: "/tmp/global-skill", scope: "global" });
    await insertResource(db, {
      id: "project-skill",
      kind: "skill",
      path: join(root, "skill"),
      scope: "project",
      projectId: "project-1",
    });
    await db.run(
      "INSERT INTO skill_issues (id, resource_id, code, severity, message, file) VALUES (?, ?, ?, ?, ?, ?)",
      ["global-issue", "global-skill", "missing-name", "error", "global issue", null],
    );
    await db.run(
      "INSERT INTO skill_issues (id, resource_id, code, severity, message, file) VALUES (?, ?, ?, ?, ?, ?)",
      ["project-issue", "project-skill", "missing-name", "error", "project issue", null],
    );

    const global = await getHealthSummary(db, { scope: "global" });
    const project = await getHealthSummary(db, { scope: "project", projectId: "project-1" });
    expect(global.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["global issue", "Agent codex not installed"]));
    expect(global.issues.some((issue) => issue.message === "project issue")).toBe(false);
    expect(project.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["project issue", "Agent codex not installed"]));
    expect(project.issues.some((issue) => issue.message === "global issue")).toBe(false);
  });

  it("honors ignore globs while listing skill files", async () => {
    const { root } = await createTestDb();
    const skillRoot = join(root, "skills");
    const skillDirectory = join(skillRoot, "demo");
    await mkdir(join(skillDirectory, "ignored"), { recursive: true });
    await writeFile(
      join(skillDirectory, "SKILL.md"),
      "---\nname: demo\ndescription: Demo\n---\n",
    );
    await writeFile(join(skillDirectory, "ignored", "secret.txt"), "secret");

    const candidates = await scanSkillRoot(skillRoot, {
      scanRoot: root,
      ignoreGlobs: ["**/ignored/**"],
      maxScanDepth: 8,
    });
    expect(candidates).toHaveLength(1);
    const files = await readFile(join(skillDirectory, "SKILL.md"), "utf8");
    expect(files).toContain("name: demo");
    expect(candidates[0]?.skill.files.some((file) => file.includes("ignored"))).toBe(false);
  });
});
