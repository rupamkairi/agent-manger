import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SyncConfigSchema, type SyncFileConfig } from "@harbor/shared";

export const SYNC_FILE = "sync.json";

export type LoadedSyncConfig = SyncFileConfig | { enabled: false };

/**
 * Reads `<harborHome>/sync.json`. A missing or invalid file yields a
 * disabled config rather than an error.
 */
export function loadSyncFile(harborHome: string): LoadedSyncConfig {
  let raw: string;
  try {
    raw = readFileSync(join(harborHome, SYNC_FILE), "utf8");
  } catch {
    return { enabled: false };
  }
  try {
    return SyncConfigSchema.parse(JSON.parse(raw));
  } catch {
    return { enabled: false };
  }
}

export function saveSyncFile(harborHome: string, config: SyncFileConfig): void {
  writeFileSync(join(harborHome, SYNC_FILE), JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}
