import { existsSync, statSync } from "node:fs";
import { isAbsolute, basename } from "node:path";
import type { AddProjectRequest, Project } from "@weave/shared";
import type { Db } from "../db/client";
import { scanProject } from "../scanner/scan";

interface ProjectRow {
  id: string;
  name: string;
  root_path: string;
  added_at: string;
  last_scanned_at: string | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    addedAt: row.added_at,
    lastScannedAt: row.last_scanned_at,
    exists: existsSync(row.root_path),
  };
}

export async function listProjects(db: Db): Promise<Project[]> {
  const rows = await db.all<ProjectRow>("SELECT * FROM projects ORDER BY added_at ASC");
  return rows.map(rowToProject);
}

export async function getProjectRow(db: Db, id: string): Promise<ProjectRow | null> {
  return db.get<ProjectRow>("SELECT * FROM projects WHERE id = ?", [id]);
}

export async function getProject(db: Db, id: string): Promise<Project | null> {
  const row = await getProjectRow(db, id);
  return row ? rowToProject(row) : null;
}

export class ProjectValidationError extends Error {
  constructor(
    message: string,
    public readonly kind: "bad_request" | "conflict",
  ) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export async function addProject(db: Db, input: AddProjectRequest): Promise<Project> {
  const { rootPath } = input;

  if (!isAbsolute(rootPath)) {
    throw new ProjectValidationError("rootPath must be an absolute path", "bad_request");
  }

  let stat;
  try {
    stat = statSync(rootPath);
  } catch {
    throw new ProjectValidationError(`Directory does not exist: ${rootPath}`, "bad_request");
  }
  if (!stat.isDirectory()) {
    throw new ProjectValidationError(`Not a directory: ${rootPath}`, "bad_request");
  }

  const existing = await db.get<ProjectRow>("SELECT * FROM projects WHERE root_path = ?", [
    rootPath,
  ]);
  if (existing) {
    throw new ProjectValidationError(`Project already added for path: ${rootPath}`, "conflict");
  }

  const id = crypto.randomUUID();
  const addedAt = new Date().toISOString();
  const name = input.name?.trim() || basename(rootPath) || rootPath;

  await db.run(
    "INSERT INTO projects (id, name, root_path, added_at, last_scanned_at) VALUES (?, ?, ?, ?, NULL)",
    [id, name, rootPath, addedAt],
  );

  const row = await getProjectRow(db, id);
  if (!row) throw new Error("Failed to read back inserted project");

  await scanProject(db, rowToProject(row));

  const finalRow = await getProjectRow(db, id);
  return rowToProject(finalRow!);
}

export async function removeProject(db: Db, id: string): Promise<boolean> {
  const row = await getProjectRow(db, id);
  if (!row) return false;
  await db.run("DELETE FROM projects WHERE id = ?", [id]);
  await db.run("DELETE FROM settings WHERE key = ?", [`project:${id}`]);
  return true;
}

export async function rescanProject(
  db: Db,
  id: string,
): Promise<{ project: Project; resourceCount: number } | null> {
  const row = await getProjectRow(db, id);
  if (!row) return null;
  const project = rowToProject(row);
  const resourceCount = await scanProject(db, project);
  const updatedRow = await getProjectRow(db, id);
  return { project: rowToProject(updatedRow!), resourceCount };
}
