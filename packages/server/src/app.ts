import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDb, type Db, type SyncConfig } from "./db/client";
import { runMigrations } from "./db/migrate";
import { loadEnv } from "./env";
import { acquireLock, releaseLock } from "./lib/lockfile";
import { initializeServer, startServer, type ServerHandle } from "./server";
import { loadSyncFile, type LoadedSyncConfig } from "./sync/config";
import { SyncManager } from "./sync/manager";

export interface StartOptions {
  port?: number;
  dbPath?: string;
  harborHome?: string;
  headless?: boolean;
  /** null = force-disable sync; undefined = read sync.json. */
  syncConfig?: SyncConfig | null;
}

export interface RunningApp {
  server: ServerHandle["server"];
  port: number;
  db: Db;
  syncConfig: LoadedSyncConfig;
  sync: SyncManager;
  stop(): Promise<void>;
}

function resolveSyncConfig(
  harborHome: string,
  option: SyncConfig | null | undefined,
): LoadedSyncConfig {
  if (option === null) return { enabled: false };
  if (option) {
    return {
      enabled: true,
      syncUrl: option.syncUrl,
      authToken: option.authToken,
      syncIntervalMs: option.syncIntervalMs ?? 60_000,
    };
  }
  return loadSyncFile(harborHome);
}

export async function startApp(options: StartOptions = {}): Promise<RunningApp> {
  const env = loadEnv();
  const port = options.port ?? env.port;
  const harborHome = options.harborHome ?? env.harborHome;
  const dbPath =
    options.dbPath ?? (options.harborHome ? join(harborHome, "harbor.db") : env.dbPath);
  mkdirSync(harborHome, { recursive: true });
  mkdirSync(dirname(dbPath), { recursive: true });

  const lockPath = acquireLock(harborHome, port);
  const syncConfig = resolveSyncConfig(harborHome, options.syncConfig);
  const transport: SyncConfig | undefined = syncConfig.enabled
    ? {
        syncUrl: syncConfig.syncUrl,
        authToken: syncConfig.authToken,
        syncIntervalMs: syncConfig.syncIntervalMs,
      }
    : undefined;

  const db = await createDb(dbPath, transport);
  const applied = await runMigrations(db);
  if (applied.length > 0) {
    console.log(`Applied migrations: ${applied.join(", ")}`);
  }

  await initializeServer(db);
  const sync = new SyncManager(db, syncConfig, harborHome);
  const handle = await startServer(db, {
    port,
    headless: options.headless ?? false,
    sync,
    harborHome,
  });
  console.log(`Harbor server listening on http://localhost:${handle.server.port}`);

  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    const steps: Array<[string, () => unknown]> = [
      ["scheduler", () => handle.scheduler.stop()],
      ["retention", () => handle.retention.stop()],
      ["staging cleanup interval", () => clearInterval(handle.cleanupInterval)],
      ["terminal sessions", () => handle.terminal.shutdown()],
      ["http server", () => handle.server.stop(true)],
      ["database", () => db.client.close()],
      ["lockfile", () => releaseLock(lockPath)],
    ];
    for (const [label, step] of steps) {
      try {
        await step();
      } catch (error) {
        console.error(`Shutdown step failed (${label}):`, error);
      }
    }
  };

  return { server: handle.server, port: handle.server.port ?? port, db, syncConfig, sync, stop };
}

export function installSignalHandlers(app: RunningApp): void {
  let stopping = false;
  const onSignal = () => {
    if (stopping) {
      process.exit(1);
    }
    stopping = true;
    const forceExit = setTimeout(() => process.exit(1), 5_000);
    forceExit.unref?.();
    void app.stop().then(() => process.exit(0));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}
