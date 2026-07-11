import { readFile, stat, unlink } from "node:fs/promises";
import type { AgentId, FilePutResponse, ResourceKind, Scope } from "@weave/shared";
import type { Db } from "../db/client";
import { sha256Hex } from "../lib/hash";
import { writeFileAtomic } from "../lib/fs-safe";
import { resolveGuardedNewPath, resolveGuardedResourcePath, type GuardedResourceRow } from "../lib/path-guard";
import { validateConfigSyntax } from "./config-validate";
import { scanGlobal, scanProject } from "../scanner/scan";
import { getProjectRow } from "./projects";

export type FileWriteErrorKind = "bad_request" | "not_found" | "conflict" | "validation_failed";

export class FileWriteError extends Error {
  constructor(
    message: string,
    public readonly kind: FileWriteErrorKind,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "FileWriteError";
  }
}

interface ResourceRow extends GuardedResourceRow {
  id: string;
  path: string;
}

async function getResourceRow(db: Db, id: string, kind: ResourceKind): Promise<ResourceRow> {
  const row = await db.get<ResourceRow>("SELECT * FROM resources WHERE id = ?", [id]);
  if (!row) throw new FileWriteError(`Resource not found: ${id}`, "not_found");
  if (row.kind !== kind) {
    throw new FileWriteError(`Resource ${id} is not a ${kind}`, "not_found");
  }
  return row;
}

async function rescanScope(db: Db, scope: Scope, projectId: string | null): Promise<void> {
  if (scope === "global") {
    await scanGlobal(db);
    return;
  }
  if (!projectId) throw new FileWriteError("projectId is required for project scope", "bad_request");
  const project = await getProjectRow(db, projectId);
  if (!project) throw new FileWriteError(`Project not found: ${projectId}`, "not_found");
  await scanProject(db, {
    id: project.id,
    name: project.name,
    rootPath: project.root_path,
    addedAt: project.added_at,
    lastScannedAt: project.last_scanned_at,
    exists: true,
  });
}

async function findRescannedResource(
  db: Db,
  kind: ResourceKind,
  originalPath: string,
  agentId: string,
  scope: Scope,
  projectId: string | null,
): Promise<{ id: string; path: string; mtime: string | null; size_bytes: number | null } | null> {
  if (projectId === null) {
    return db.get<{ id: string; path: string; mtime: string | null; size_bytes: number | null }>(
      `SELECT id, path, mtime, size_bytes FROM resources
       WHERE kind = ? AND original_path = ? AND agent_id = ? AND scope = ? AND project_id IS NULL`,
      [kind, originalPath, agentId, scope],
    );
  }
  return db.get<{ id: string; path: string; mtime: string | null; size_bytes: number | null }>(
    `SELECT id, path, mtime, size_bytes FROM resources
     WHERE kind = ? AND original_path = ? AND agent_id = ? AND scope = ? AND project_id = ?`,
    [kind, originalPath, agentId, scope, projectId],
  );
}

export interface PutResourceFileInput {
  id: string;
  kind: ResourceKind;
  content: string;
  ifHash: string;
}

export async function putResourceFile(db: Db, input: PutResourceFileInput): Promise<FilePutResponse> {
  const row = await getResourceRow(db, input.id, input.kind);

  const target = await resolveGuardedResourcePath(db, row);
  if (!target) {
    throw new FileWriteError(`Resource path is no longer valid: ${input.id}`, "bad_request");
  }

  let currentBytes: Buffer;
  try {
    currentBytes = await readFile(target);
  } catch {
    throw new FileWriteError(`Unable to read current file: ${target}`, "bad_request");
  }
  const currentHash = sha256Hex(currentBytes);
  if (currentHash !== input.ifHash) {
    const currentStat = await stat(target).catch(() => null);
    throw new FileWriteError("File has changed on disk", "conflict", {
      currentHash,
      mtime: currentStat ? new Date(currentStat.mtimeMs).toISOString() : null,
    });
  }

  if (input.kind === "config") {
    const syntaxError = validateConfigSyntax(target, input.content);
    if (syntaxError) {
      throw new FileWriteError(syntaxError.message, "validation_failed", syntaxError);
    }
  }

  await writeFileAtomic(target, input.content);
  await rescanScope(db, row.scope, row.project_id);

  const fresh = await findRescannedResource(
    db,
    row.kind,
    row.original_path,
    row.agent_id,
    row.scope,
    row.project_id,
  );
  if (!fresh) {
    throw new FileWriteError("File written but could not be re-located after rescan", "not_found");
  }

  return {
    id: fresh.id,
    path: fresh.path,
    hash: sha256Hex(input.content),
    sizeBytes: fresh.size_bytes ?? Buffer.byteLength(input.content),
    mtime: fresh.mtime,
  };
}

export interface CreateResourceFileInput {
  agentId: AgentId;
  scope: Scope;
  projectId?: string | null;
  path: string;
  content: string;
  kind: "instruction" | "memory";
}

export async function createResourceFile(
  db: Db,
  input: CreateResourceFileInput,
): Promise<FilePutResponse> {
  if (input.scope === "project" && input.projectId) {
    const project = await getProjectRow(db, input.projectId);
    if (!project) throw new FileWriteError(`Project not found: ${input.projectId}`, "not_found");
  }

  const target = await resolveGuardedNewPath(db, {
    agentId: input.agentId,
    scope: input.scope,
    projectId: input.projectId ?? null,
    path: input.path,
    kind: input.kind,
  });
  if (!target) {
    throw new FileWriteError(
      `Path does not match any ${input.kind} pattern for ${input.agentId}/${input.scope}`,
      "bad_request",
    );
  }

  const exists = await stat(target).catch(() => null);
  if (exists) {
    throw new FileWriteError(`File already exists: ${target}`, "conflict");
  }

  await writeFileAtomic(target, input.content);
  await rescanScope(db, input.scope, input.projectId ?? null);

  const fresh = await findRescannedResource(
    db,
    input.kind,
    target,
    input.agentId,
    input.scope,
    input.projectId ?? null,
  );
  if (!fresh) {
    throw new FileWriteError("File created but could not be located after rescan", "not_found");
  }

  return {
    id: fresh.id,
    path: fresh.path,
    hash: sha256Hex(input.content),
    sizeBytes: fresh.size_bytes ?? Buffer.byteLength(input.content),
    mtime: fresh.mtime,
  };
}

export interface DeleteResourceFileInput {
  id: string;
  kind: "instruction" | "memory";
}

export async function deleteResourceFile(db: Db, input: DeleteResourceFileInput): Promise<void> {
  const row = await getResourceRow(db, input.id, input.kind);
  const target = await resolveGuardedResourcePath(db, row);
  if (!target) {
    throw new FileWriteError(`Resource path is no longer valid: ${input.id}`, "bad_request");
  }

  await unlink(target).catch((error) => {
    throw new FileWriteError(`Unable to delete file: ${target}`, "bad_request", String(error));
  });
  await rescanScope(db, row.scope, row.project_id);
}
