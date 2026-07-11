import { open } from "node:fs/promises";
import type {
  AgentId,
  ConfigResource,
  InstructionResource,
  MemoryResource,
  ResourceKind,
  ResourceRecord,
  ResourceContent,
  Scope,
  Skill,
  SkillResource,
  SkillStatus,
  SkillValidationIssue,
} from "@weave/shared";
import type { InValue } from "@libsql/client";
import type { Db } from "../db/client";
import { sha256Hex } from "../lib/hash";
import { resolveGuardedResourcePath } from "../lib/path-guard";

const MAX_CONTENT_BYTES = 256 * 1024;

interface ResourceRow {
  id: string;
  kind: ResourceKind;
  path: string;
  original_path: string;
  is_symlink: number;
  symlink_broken: number;
  scope: Scope;
  project_id: string | null;
  agent_id: string;
  size_bytes: number | null;
  mtime: string | null;
  last_scanned_at: string;
  meta_json: string;
}

interface SkillIssueRow {
  code: string;
  severity: string;
  message: string;
  file: string | null;
}

export interface ResourceFilters {
  scope?: Scope;
  agentId?: AgentId;
  projectId?: string;
  status?: SkillStatus;
}

async function getSkillIssues(db: Db, resourceId: string): Promise<SkillValidationIssue[]> {
  const rows = await db.all<SkillIssueRow>(
    "SELECT code, severity, message, file FROM skill_issues WHERE resource_id = ?",
    [resourceId],
  );
  return rows.map((row) => ({
    code: row.code as SkillValidationIssue["code"],
    severity: row.severity as SkillValidationIssue["severity"],
    message: row.message,
    file: row.file,
  }));
}

async function rowToRecord(db: Db, row: ResourceRow): Promise<ResourceRecord> {
  const meta = JSON.parse(row.meta_json) as Record<string, unknown>;
  const base = {
    id: row.id,
    path: row.path,
    originalPath: row.original_path,
    isSymlink: Boolean(row.is_symlink),
    symlinkBroken: Boolean(row.symlink_broken),
    scope: row.scope,
    projectId: row.project_id,
    agentId: row.agent_id as AgentId,
    sizeBytes: row.size_bytes,
    mtime: row.mtime,
    lastScannedAt: row.last_scanned_at,
  };

  if (row.kind === "skill") {
    const skill = meta.skill as Skill;
    const issues = await getSkillIssues(db, row.id);
    const resolvedSkill: Skill = { ...skill, issues };
    const record: SkillResource = { ...base, kind: "skill", skill: resolvedSkill };
    return record;
  }

  if (row.kind === "instruction") {
    const record: InstructionResource = {
      ...base,
      kind: "instruction",
      instruction: { fileName: meta.fileName as string, isEmpty: meta.isEmpty as boolean },
    };
    return record;
  }

  if (row.kind === "memory") {
    const record: MemoryResource = {
      ...base,
      kind: "memory",
      memory: { fileName: meta.fileName as string, isEmpty: meta.isEmpty as boolean },
    };
    return record;
  }

  const record: ConfigResource = {
    ...base,
    kind: "config",
    config: {
      fileName: meta.fileName as string,
      format: meta.format as ConfigResource["config"]["format"],
      isEmpty: meta.isEmpty as boolean,
    },
  };
  return record;
}

export async function listResourcesByKind(
  db: Db,
  kind: ResourceKind,
  filters: ResourceFilters,
): Promise<ResourceRecord[]> {
  const clauses = ["kind = ?"];
  const args: InValue[] = [kind];

  if (filters.scope) {
    clauses.push("scope = ?");
    args.push(filters.scope);
  }
  if (filters.agentId) {
    clauses.push("agent_id = ?");
    args.push(filters.agentId);
  }
  if (filters.projectId) {
    clauses.push("project_id = ?");
    args.push(filters.projectId);
  }

  const rows = await db.all<ResourceRow>(
    `SELECT * FROM resources WHERE ${clauses.join(" AND ")} ORDER BY last_scanned_at DESC`,
    args,
  );

  const records = await Promise.all(rows.map((row) => rowToRecord(db, row)));

  if (filters.status && kind === "skill") {
    return records.filter(
      (record) => record.kind === "skill" && record.skill.status === filters.status,
    );
  }

  return records;
}

export async function getResource(db: Db, id: string): Promise<ResourceRecord | null> {
  const row = await db.get<ResourceRow>("SELECT * FROM resources WHERE id = ?", [id]);
  if (!row) return null;
  return rowToRecord(db, row);
}

export async function getResourceContent(db: Db, id: string): Promise<ResourceContent | null> {
  const row = await db.get<ResourceRow>("SELECT * FROM resources WHERE id = ?", [id]);
  if (!row) return null;
  const target = await resolveGuardedResourcePath(db, row);
  if (!target) return null;

  const file = await open(target, "r").catch(() => null);
  if (!file) return null;
  try {
    const stat = await file.stat();
    if (!stat.isFile()) return null;
    const bytesToRead = Math.min(stat.size, MAX_CONTENT_BYTES);
    const buffer = new Uint8Array(bytesToRead);
    const { bytesRead } = await file.read(buffer, 0, bytesToRead, 0);
    const served = buffer.subarray(0, bytesRead);
    return {
      id: row.id,
      path: target,
      content: new TextDecoder().decode(served),
      truncated: stat.size > MAX_CONTENT_BYTES,
      sizeBytes: stat.size,
      hash: sha256Hex(served),
    };
  } catch {
    return null;
  } finally {
    await file.close();
  }
}
