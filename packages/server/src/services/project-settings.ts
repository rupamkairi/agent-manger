import { ProjectSettingsSchema, type ProjectSettings, type ProjectSettingsPatch } from "@weave/shared";
import type { Db } from "../db/client";
import { getProjectRow } from "./projects";

function settingsKey(projectId: string): string {
  return `project:${projectId}`;
}

export async function getProjectSettings(db: Db, projectId: string): Promise<ProjectSettings | null> {
  const project = await getProjectRow(db, projectId);
  if (!project) return null;

  const row = await db.get<{ value_json: string }>("SELECT value_json FROM settings WHERE key = ?", [
    settingsKey(projectId),
  ]);
  if (!row) return ProjectSettingsSchema.parse({});
  try {
    return ProjectSettingsSchema.parse(JSON.parse(row.value_json));
  } catch {
    return ProjectSettingsSchema.parse({});
  }
}

export async function putProjectSettings(
  db: Db,
  projectId: string,
  patch: ProjectSettingsPatch,
): Promise<ProjectSettings | null> {
  const current = await getProjectSettings(db, projectId);
  if (!current) return null;

  const next = ProjectSettingsSchema.parse({ ...current, ...patch });
  await db.run(
    `INSERT INTO settings (key, value_json) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
    [settingsKey(projectId), JSON.stringify(next)],
  );
  return next;
}
