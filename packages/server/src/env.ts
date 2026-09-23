import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Env {
  port: number;
  harborHome: string;
  dbPath: string;
}

export function loadEnv(): Env {
  const harborHome = process.env.HARBOR_HOME ?? join(homedir(), ".harbor");
  const dbPath = process.env.HARBOR_DB_PATH ?? join(harborHome, "harbor.db");
  const port = Number(process.env.HARBOR_PORT ?? 11123);

  mkdirSync(harborHome, { recursive: true });
  mkdirSync(dirname(dbPath), { recursive: true });

  return { port, harborHome, dbPath };
}
