import { homedir } from "node:os";
import type { Project, Scope, Skill, SkillIssueCode } from "@weave/shared";
import { listAdapters } from "../adapters/registry";
import { resolveGlobalPath, resolveProjectPath, type AgentAdapter } from "../adapters/types";
import type { Db } from "../db/client";
import { getSettings } from "../services/settings";
import { getProjectSettings } from "../services/project-settings";
import { scanConfigFiles } from "./configs";
import type { ConfigFileRecord } from "./configs";
import { scanInstructionFiles } from "./instructions";
import { scanMemoryFiles } from "./memory";
import type { FileRecord } from "./file-record";
import { scanSkillRoot, type SkillCandidate } from "./skills";
import type { GlobMatchOptions } from "./walk";

interface ResourceRow {
  id: string;
  kind: "skill" | "instruction" | "memory" | "config";
  path: string;
  originalPath: string;
  isSymlink: boolean;
  symlinkBroken: boolean;
  scope: Scope;
  projectId: string | null;
  agentId: string;
  sizeBytes: number | null;
  mtime: string | null;
  lastScannedAt: string;
  meta: Record<string, unknown>;
  skill?: Skill;
}

async function collectSkillRows(
  adapter: AgentAdapter,
  scope: Scope,
  projectId: string | null,
  projectRoot: string | null,
  scanRoot: string,
  options: GlobMatchOptions,
  now: string,
): Promise<ResourceRow[]> {
  const skillRoots = scope === "global" ? adapter.globalSkillRoots : adapter.projectSkillRoots;
  const rows: ResourceRow[] = [];

  for (const rawRoot of skillRoots) {
    const root =
      scope === "global" ? resolveGlobalPath(rawRoot) : resolveProjectPath(projectRoot ?? "", rawRoot);
    const candidates: SkillCandidate[] = await scanSkillRoot(root, { ...options, scanRoot });

    for (const candidate of candidates) {
      rows.push({
        id: crypto.randomUUID(),
        kind: "skill",
        path: candidate.resolvedPath,
        originalPath: candidate.originalPath,
        isSymlink: candidate.isSymlink,
        symlinkBroken: candidate.symlinkBroken,
        scope,
        projectId,
        agentId: adapter.id,
        sizeBytes: candidate.sizeBytes,
        mtime: candidate.mtime,
        lastScannedAt: now,
        meta: {},
        skill: candidate.skill,
      });
    }
  }

  return rows;
}

function fileRecordToRow(
  kind: "instruction" | "memory",
  record: FileRecord,
  adapter: AgentAdapter,
  scope: Scope,
  projectId: string | null,
  now: string,
): ResourceRow {
  return {
    id: crypto.randomUUID(),
    kind,
    path: record.resolvedPath,
    originalPath: record.originalPath,
    isSymlink: record.isSymlink,
    symlinkBroken: record.symlinkBroken,
    scope,
    projectId,
    agentId: adapter.id,
    sizeBytes: record.sizeBytes,
    mtime: record.mtime,
    lastScannedAt: now,
    meta: { fileName: record.fileName, isEmpty: record.isEmpty },
  };
}

function configRecordToRow(
  record: ConfigFileRecord,
  adapter: AgentAdapter,
  scope: Scope,
  projectId: string | null,
  now: string,
): ResourceRow {
  return {
    id: crypto.randomUUID(),
    kind: "config",
    path: record.resolvedPath,
    originalPath: record.originalPath,
    isSymlink: record.isSymlink,
    symlinkBroken: record.symlinkBroken,
    scope,
    projectId,
    agentId: adapter.id,
    sizeBytes: record.sizeBytes,
    mtime: record.mtime,
    lastScannedAt: now,
    meta: { fileName: record.fileName, isEmpty: record.isEmpty, format: record.format },
  };
}

function markDuplicateSkillNames(rows: ResourceRow[]): void {
  const groups = new Map<string, ResourceRow[]>();
  for (const row of rows) {
    if (row.kind !== "skill" || !row.skill) continue;
    if (!row.skill.name) continue;
    const key = `${row.agentId}::${row.scope}::${row.projectId ?? ""}::${row.skill.name}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (const row of list) {
      if (!row.skill) continue;
      const alreadyFlagged = row.skill.issues.some((i) => i.code === "duplicate-name");
      if (alreadyFlagged) continue;
      const issues = [
        ...row.skill.issues,
        {
          code: "duplicate-name" as SkillIssueCode,
          severity: "warning" as const,
          message: `Skill name "${row.skill.name}" is used by more than one skill.`,
          file: null,
        },
      ];
      const hasError = issues.some((i) => i.severity === "error");
      const status = hasError ? "invalid" : "warning";
      row.skill = { ...row.skill, issues, status };
    }
  }
}

async function collectScopeRows(
  db: Db,
  scope: Scope,
  projectId: string | null,
  scanRoot: string,
  projectRoot: string | null,
  extraIgnoreGlobs: string[] = [],
): Promise<ResourceRow[]> {
  const settings = await getSettings(db);
  const globOptions = {
    ignoreGlobs: [...settings.scanIgnoreGlobs, ...extraIgnoreGlobs],
    maxScanDepth: settings.maxScanDepth,
  };
  const now = new Date().toISOString();
  const rows: ResourceRow[] = [];

  for (const adapter of listAdapters()) {
    const skillRows = await collectSkillRows(
      adapter,
      scope,
      projectId,
      projectRoot,
      scanRoot,
      globOptions,
      now,
    );
    rows.push(...skillRows);

    const instructionRecords = await scanInstructionFiles(
      adapter,
      scope,
      scanRoot,
      projectRoot,
      globOptions,
    );
    for (const record of instructionRecords) {
      rows.push(fileRecordToRow("instruction", record, adapter, scope, projectId, now));
    }

    const memoryRecords = await scanMemoryFiles(adapter, scope, scanRoot, projectRoot, globOptions);
    for (const record of memoryRecords) {
      rows.push(fileRecordToRow("memory", record, adapter, scope, projectId, now));
    }

    const configRecords = await scanConfigFiles(adapter, scope, scanRoot, projectRoot, globOptions);
    for (const record of configRecords) {
      rows.push(configRecordToRow(record, adapter, scope, projectId, now));
    }
  }

  markDuplicateSkillNames(rows);
  return rows;
}

async function persistRows(
  db: Db,
  scope: Scope,
  projectId: string | null,
  rows: ResourceRow[],
): Promise<number> {
  await db.run("BEGIN");
  try {
    if (scope === "global") {
      await db.run(
        "DELETE FROM skill_issues WHERE resource_id IN (SELECT id FROM resources WHERE scope = 'global')",
      );
      await db.run("DELETE FROM resources WHERE scope = 'global'");
    } else {
      await db.run(
        "DELETE FROM skill_issues WHERE resource_id IN (SELECT id FROM resources WHERE scope = 'project' AND project_id = ?)",
        [projectId],
      );
      await db.run("DELETE FROM resources WHERE scope = 'project' AND project_id = ?", [projectId]);
    }

    for (const row of rows) {
      const meta = (() => {
        if (row.kind !== "skill" || !row.skill) return row.meta;
        const { issues: _issues, ...skill } = row.skill;
        return { skill };
      })();
      await db.run(
        `INSERT INTO resources
          (id, kind, path, original_path, is_symlink, symlink_broken, scope, project_id,
           agent_id, size_bytes, mtime, last_scanned_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.kind,
          row.path,
          row.originalPath,
          row.isSymlink ? 1 : 0,
          row.symlinkBroken ? 1 : 0,
          row.scope,
          row.projectId,
          row.agentId,
          row.sizeBytes,
          row.mtime,
          row.lastScannedAt,
          JSON.stringify(meta),
        ],
      );

      if (row.kind === "skill" && row.skill) {
        for (const skillIssue of row.skill.issues) {
          await db.run(
            `INSERT INTO skill_issues (id, resource_id, code, severity, message, file)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), row.id, skillIssue.code, skillIssue.severity, skillIssue.message, skillIssue.file],
          );
        }
      }
    }

    if (scope === "project" && projectId) {
      await db.run("UPDATE projects SET last_scanned_at = ? WHERE id = ?", [
        new Date().toISOString(),
        projectId,
      ]);
    }

    await db.run("COMMIT");
  } catch (e) {
    await db.run("ROLLBACK").catch(() => {});
    throw e;
  }

  return rows.length;
}

export async function scanGlobal(db: Db): Promise<number> {
  const scanRoot = homedir();
  const rows = await collectScopeRows(db, "global", null, scanRoot, null);
  return persistRows(db, "global", null, rows);
}

export async function scanProject(db: Db, project: Project): Promise<number> {
  const scanRoot = project.rootPath;
  let ignoredPaths: string[] = [];
  try {
    const projectSettings = await getProjectSettings(db, project.id);
    ignoredPaths = projectSettings?.ignoredPaths ?? [];
  } catch {
    ignoredPaths = [];
  }
  const rows = await collectScopeRows(
    db,
    "project",
    project.id,
    scanRoot,
    project.rootPath,
    ignoredPaths,
  );
  return persistRows(db, "project", project.id, rows);
}
