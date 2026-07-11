import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowSummary,
} from "@weave/shared";
import type { Db } from "../db/client";

interface WorkflowRow {
  id: string;
  name: string;
  version: number;
  json: string;
  created_at: string;
  updated_at: string;
}

function parseRow(row: WorkflowRow): WorkflowDefinition {
  return WorkflowDefinitionSchema.parse(JSON.parse(row.json));
}

export async function listWorkflows(db: Db): Promise<WorkflowSummary[]> {
  const rows = await db.all<WorkflowRow>("SELECT * FROM workflows ORDER BY updated_at DESC");
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: parseRow(row).description,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getWorkflow(db: Db, id: string): Promise<WorkflowDefinition | null> {
  const row = await db.get<WorkflowRow>("SELECT * FROM workflows WHERE id = ?", [id]);
  return row ? parseRow(row) : null;
}

export async function createWorkflow(db: Db, input: unknown): Promise<WorkflowDefinition> {
  const workflow = WorkflowDefinitionSchema.parse(input);
  const now = new Date().toISOString();
  await db.run(
    "INSERT INTO workflows (id, name, version, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [workflow.id, workflow.name, workflow.version, JSON.stringify(workflow), now, now],
  );
  return workflow;
}

export async function updateWorkflow(
  db: Db,
  id: string,
  input: unknown,
): Promise<WorkflowDefinition | null> {
  const existing = await getWorkflow(db, id);
  if (!existing) return null;
  const workflow = WorkflowDefinitionSchema.parse({ ...(input as object), id });
  await db.run("UPDATE workflows SET name = ?, version = ?, json = ?, updated_at = ? WHERE id = ?", [
    workflow.name,
    workflow.version,
    JSON.stringify(workflow),
    new Date().toISOString(),
    id,
  ]);
  return workflow;
}

export async function deleteWorkflow(db: Db, id: string): Promise<boolean> {
  if (!(await getWorkflow(db, id))) return false;
  await db.run("DELETE FROM workflows WHERE id = ?", [id]);
  return true;
}
