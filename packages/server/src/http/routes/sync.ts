import {
  DbSyncStatusSchema,
  SyncConfigPutResultSchema,
  SyncConfigPublicSchema,
  SyncConfigSchema,
  type SyncConfigPublic,
} from "@weave/shared";
import type { Db } from "../../db/client";
import type { Router } from "../../router";
import { loadSyncFile, saveSyncFile, type LoadedSyncConfig } from "../../sync/config";
import { getHostname, type SyncManager } from "../../sync/manager";
import { err, ok } from "../respond";
import { validateBody } from "../validate";

export interface SyncRouteDeps {
  db: Db;
  sync: SyncManager | null;
  weaveHome: string;
}

const DEFAULT_SYNC_INTERVAL_MS = 60_000;

function toPublicConfig(config: LoadedSyncConfig): SyncConfigPublic {
  if (!config.enabled) {
    return { enabled: false, syncIntervalMs: DEFAULT_SYNC_INTERVAL_MS, hasAuthToken: false };
  }
  return {
    enabled: true,
    syncUrl: config.syncUrl,
    syncIntervalMs: config.syncIntervalMs,
    hasAuthToken: Boolean(config.authToken),
  };
}

export function registerSyncRoutes(router: Router, deps: SyncRouteDeps): void {
  router.get("/api/v1/sync/config", async () =>
    ok(toPublicConfig(loadSyncFile(deps.weaveHome)), SyncConfigPublicSchema),
  );

  router.put("/api/v1/sync/config", async ({ request }) => {
    const body = await validateBody(request, SyncConfigSchema);
    saveSyncFile(deps.weaveHome, body);
    return ok({ config: toPublicConfig(body), restartRequired: true }, SyncConfigPutResultSchema);
  });

  router.get("/api/v1/sync/status", async () => {
    if (deps.sync) return ok(deps.sync.getStatus(), DbSyncStatusSchema);
    const fileConfig = loadSyncFile(deps.weaveHome);
    return ok(
      {
        enabled: false,
        hostname: getHostname(),
        lastSyncAt: null,
        error: null,
        restartRequired: fileConfig.enabled,
      },
      DbSyncStatusSchema,
    );
  });

  router.post("/api/v1/sync/now", async () => {
    if (!deps.sync || !deps.sync.getStatus().enabled) {
      return err("conflict", "Sync is not enabled", 409);
    }
    return ok(await deps.sync.syncNow(), DbSyncStatusSchema);
  });
}
