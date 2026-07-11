import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Env {
  port: number;
  weaveHome: string;
  dbPath: string;
}

export function loadEnv(): Env {
  const weaveHome = process.env.WEAVE_HOME ?? join(homedir(), ".weave");
  const dbPath = process.env.WEAVE_DB_PATH ?? join(weaveHome, "weave.db");
  const port = Number(process.env.WEAVE_PORT ?? 3000);

  mkdirSync(weaveHome, { recursive: true });
  mkdirSync(dirname(dbPath), { recursive: true });

  return { port, weaveHome, dbPath };
}
