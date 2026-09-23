import { Database } from "bun:sqlite";
import type { Client as LibsqlClient, InValue as LibsqlInValue } from "@libsql/client";

export interface SyncConfig {
  syncUrl: string;
  authToken?: string;
  syncIntervalMs?: number;
}

/** Positional query bindings. Normalized per backend before execution. */
export type DbValue =
  | string
  | number
  | bigint
  | Uint8Array
  | ArrayBuffer
  | boolean
  | Date
  | null
  | undefined;

export interface ExecuteResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
  lastInsertRowid: number | bigint | null;
}

export type ExecuteInput = string | { sql: string; args?: DbValue[] };

export interface DbTx {
  execute(input: ExecuteInput): Promise<ExecuteResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DbClient {
  execute(input: ExecuteInput): Promise<ExecuteResult>;
  transaction(mode?: string): Promise<DbTx>;
  /** Embedded-replica sync. Absent on backends without sync support. */
  sync?(): Promise<{ frame_no?: number; frames_synced?: number } | undefined>;
  close(): void | Promise<void>;
}

export interface Db {
  client: DbClient;
  run(sql: string, args?: DbValue[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, args?: DbValue[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, args?: DbValue[]): Promise<T | null>;
}

function makeDb(client: DbClient): Db {
  return {
    client,
    async run(sql, args = []) {
      await client.execute({ sql, args });
    },
    async all<T>(sql: string, args: DbValue[] = []): Promise<T[]> {
      const result = await client.execute({ sql, args });
      return result.rows as unknown as T[];
    },
    async get<T>(sql: string, args: DbValue[] = []): Promise<T | null> {
      const result = await client.execute({ sql, args });
      return (result.rows[0] as unknown as T) ?? null;
    },
  };
}

function normalizeArg(value: DbValue): string | number | bigint | Uint8Array | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "bigint" ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  return String(value);
}

/** Statements that return rows under bun:sqlite's query().all(). */
const READ_RE = /^\s*(select|with|values|explain|pragma)\b/i;

function toInput(input: ExecuteInput): { sql: string; args: DbValue[] } {
  return typeof input === "string" ? { sql: input, args: [] } : { sql: input.sql, args: input.args ?? [] };
}

class BunSqliteClient implements DbClient {
  constructor(private readonly db: Database) {}

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const { sql, args } = toInput(input);
    const params = args.map(normalizeArg);
    const stmt = this.db.query(sql);
    if (READ_RE.test(sql)) {
      const rows = stmt.all(...params) as Record<string, unknown>[];
      return { rows, rowsAffected: 0, lastInsertRowid: null };
    }
    const info = stmt.run(...params);
    return {
      rows: [],
      rowsAffected: Number(info.changes),
      lastInsertRowid: info.lastInsertRowid as number | bigint,
    };
  }

  async transaction(): Promise<DbTx> {
    this.db.exec("BEGIN IMMEDIATE");
    let done = false;
    const finish = (keyword: "COMMIT" | "ROLLBACK"): void => {
      if (!done) {
        done = true;
        this.db.exec(keyword);
      }
    };
    return {
      execute: (input) => this.execute(input),
      commit: async () => {
        finish("COMMIT");
      },
      rollback: async () => {
        finish("ROLLBACK");
      },
    };
  }

  close(): void {
    this.db.close();
  }
}

function wrapLibsqlResult(result: {
  rows: unknown;
  rowsAffected: number;
  lastInsertRowid?: number | bigint;
}): ExecuteResult {
  return {
    rows: result.rows as Record<string, unknown>[],
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid ?? null,
  };
}

function wrapLibsql(client: LibsqlClient): DbClient {
  const execute = async (input: ExecuteInput): Promise<ExecuteResult> => {
    if (typeof input === "string") {
      return wrapLibsqlResult(await client.execute(input));
    }
    return wrapLibsqlResult(
      await client.execute({ sql: input.sql, args: (input.args ?? []) as LibsqlInValue[] }),
    );
  };
  return {
    execute,
    async transaction(mode = "write"): Promise<DbTx> {
      const tx = await client.transaction(mode as "write" | "read" | "deferred");
      return {
        execute: async (input) => {
          if (typeof input === "string") {
            return wrapLibsqlResult(await tx.execute(input));
          }
          return wrapLibsqlResult(
            await tx.execute({ sql: input.sql, args: (input.args ?? []) as LibsqlInValue[] }),
          );
        },
        commit: () => tx.commit(),
        rollback: () => tx.rollback(),
      };
    },
    sync: () => client.sync(),
    close: () => client.close(),
  };
}

export async function createDb(dbPath: string, syncConfig?: SyncConfig): Promise<Db> {
  if (syncConfig) {
    // Lazy: keeps the native libsql binding out of the default bundle path
    // so `bun build --compile` binaries boot without it (local mode).
    const { createClient } = await import("@libsql/client");
    const client = createClient({
      url: `file:${dbPath}`,
      syncUrl: syncConfig.syncUrl,
      authToken: syncConfig.authToken,
      syncInterval: Math.max(1, Math.round((syncConfig.syncIntervalMs ?? 60_000) / 1000)),
    });
    return makeDb(wrapLibsql(client));
  }
  return makeDb(new BunSqliteClient(new Database(dbPath)));
}
