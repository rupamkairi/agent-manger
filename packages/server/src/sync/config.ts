import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SyncConfigSchema, type SyncFileConfig } from "@weave/shared";

export const SYNC_FILE = "sync.json";

export type LoadedSyncConfig = SyncFileConfig | { enabled: false };

/**
 * Reads `<weaveHome>/sync.json`. A missing or invalid file yields a
 * disabled config rather than an error.
 */
export function loadSyncFile(weaveHome: string): LoadedSyncConfig {
  let raw: string;
  try {
    raw = readFileSync(join(weaveHome, SYNC_FILE), "utf8");
  } catch {
    return { enabled: false };
  }
  try {
    return SyncConfigSchema.parse(JSON.parse(raw));
  } catch {
    return { enabled: false };
  }
}

export function saveSyncFile(weaveHome: string, config: SyncFileConfig): void {
  writeFileSync(join(weaveHome, SYNC_FILE), JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}
