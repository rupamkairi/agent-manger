import type { Db } from "./client";
// NOTE: .sql text imports are resolved by the Bun bundler (dev and
// `bun build --compile` embed them). tsc cannot resolve unknown
// extensions even with the "*.sql" wildcard in sql.d.ts, hence ts-ignore.
// Add new migrations here in order (see MIGRATIONS below).
// @ts-ignore: Bun text import
import sql001 from "./migrations/001_initial.sql" with { type: "text" };
// @ts-ignore: Bun text import
import sql002 from "./migrations/002_write_path.sql" with { type: "text" };
// @ts-ignore: Bun text import
import sql003 from "./migrations/003_workflows.sql" with { type: "text" };
// @ts-ignore: Bun text import
import sql004 from "./migrations/004_sync_hosts.sql" with { type: "text" };
// @ts-ignore: Bun text import
import sql005 from "./migrations/005_terminal_sessions.sql" with { type: "text" };

// Static manifest (ordered): directory scanning via readdirSync does not
// work inside `bun build --compile` binaries (virtual /$bunfs paths),
// while text imports are embedded. Add new migrations here in order.
const MIGRATIONS: Array<readonly [string, string]> = [
  ["001_initial.sql", sql001],
  ["002_write_path.sql", sql002],
  ["003_workflows.sql", sql003],
  ["004_sync_hosts.sql", sql004],
  ["005_terminal_sessions.sql", sql005],
];

export async function runMigrations(db: Db): Promise<string[]> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )`,
  );

  const applied = new Set(
    (await db.all<{ name: string }>("SELECT name FROM _migrations")).map((r) => r.name),
  );

  const ran: string[] = [];
  for (const [file, sql] of MIGRATIONS) {
    if (applied.has(file)) continue;
    const statements = sql
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);

    const tx = await db.client.transaction("write");
    try {
      for (const statement of statements) {
        await tx.execute(statement);
      }
      await tx.execute({
        sql: "INSERT INTO _migrations (name) VALUES (?)",
        args: [file],
      });
      await tx.commit();
      ran.push(file);
    } catch (error) {
      await tx.rollback();
      throw new Error(`Migration ${file} failed: ${String(error)}`);
    }
  }
  return ran;
}
