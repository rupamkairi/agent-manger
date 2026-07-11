import { hostname } from "node:os";
import type { DbSyncStatus } from "@weave/shared";
import type { Db } from "../db/client";
import { loadSyncFile, type LoadedSyncConfig } from "./config";

let cachedHostname: string | null = null;

export function getHostname(): string {
  if (cachedHostname === null) cachedHostname = hostname();
  return cachedHostname;
}

/**
 * Drives libSQL embedded-replica sync and reports the last outcome. Sync
 * failures are recorded on the status rather than thrown, so callers (the
 * HTTP route and any future background timer) never need a try/catch.
 */
export class SyncManager {
  private lastSyncAt: string | null = null;
  private frameNo: number | undefined;
  private framesSynced: number | undefined;
  private error: string | null = null;

  constructor(
    private readonly db: Db,
    private readonly activeConfig: LoadedSyncConfig,
    private readonly weaveHome: string,
  ) {}

  async syncNow(): Promise<DbSyncStatus> {
    try {
      const replicated = await this.db.client.sync();
      this.lastSyncAt = new Date().toISOString();
      if (replicated) {
        this.frameNo = replicated.frame_no;
        this.framesSynced = replicated.frames_synced;
      }
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
    return this.getStatus();
  }

  getStatus(): DbSyncStatus {
    return {
      enabled: this.activeConfig.enabled,
      hostname: getHostname(),
      lastSyncAt: this.lastSyncAt,
      ...(this.frameNo !== undefined ? { frameNo: this.frameNo } : {}),
      ...(this.framesSynced !== undefined ? { framesSynced: this.framesSynced } : {}),
      error: this.error,
      restartRequired: !sameConfig(loadSyncFile(this.weaveHome), this.activeConfig),
    };
  }
}

// Field-wise comparison: JSON.stringify equality is key-order sensitive.
function sameConfig(a: LoadedSyncConfig, b: LoadedSyncConfig): boolean {
  if (a.enabled !== b.enabled) return false;
  if (!a.enabled && !b.enabled) return true;
  const left = a as Extract<LoadedSyncConfig, { syncUrl: string }>;
  const right = b as Extract<LoadedSyncConfig, { syncUrl: string }>;
  return (
    left.syncUrl === right.syncUrl &&
    left.authToken === right.authToken &&
    left.syncIntervalMs === right.syncIntervalMs
  );
}
