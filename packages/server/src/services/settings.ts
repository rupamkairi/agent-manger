import { SettingsSchema, type Settings, type SettingsPatch } from "@weave/shared";
import type { Db } from "../db/client";

const SETTINGS_KEY = "app";

export async function getSettings(db: Db): Promise<Settings> {
  const row = await db.get<{ value_json: string }>(
    "SELECT value_json FROM settings WHERE key = ?",
    [SETTINGS_KEY],
  );
  if (!row) return SettingsSchema.parse({});
  try {
    return SettingsSchema.parse(JSON.parse(row.value_json));
  } catch {
    return SettingsSchema.parse({});
  }
}

export async function patchSettings(db: Db, patch: SettingsPatch): Promise<Settings> {
  const current = await getSettings(db);
  const next = SettingsSchema.parse({ ...current, ...patch });
  await db.run(
    `INSERT INTO settings (key, value_json) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
    [SETTINGS_KEY, JSON.stringify(next)],
  );
  return next;
}
