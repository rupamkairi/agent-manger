import { createClient, type Client, type InValue } from "@libsql/client";

export interface SyncConfig {
  syncUrl: string;
  authToken?: string;
  syncIntervalMs?: number;
}

export interface Db {
  client: Client;
  run(sql: string, args?: InValue[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, args?: InValue[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, args?: InValue[]): Promise<T | null>;
}

export function createDb(dbPath: string, syncConfig?: SyncConfig): Db {
  const client = syncConfig
    ? createClient({
        url: `file:${dbPath}`,
        syncUrl: syncConfig.syncUrl,
        authToken: syncConfig.authToken,
        syncInterval: Math.max(1, Math.round((syncConfig.syncIntervalMs ?? 60_000) / 1000)),
      })
    : createClient({ url: `file:${dbPath}` });

  return {
    client,
    async run(sql, args = []) {
      await client.execute({ sql, args });
    },
    async all<T>(sql: string, args: InValue[] = []) {
      const result = await client.execute({ sql, args });
      return result.rows as unknown as T[];
    },
    async get<T>(sql: string, args: InValue[] = []) {
      const result = await client.execute({ sql, args });
      return (result.rows[0] as unknown as T) ?? null;
    },
  };
}
