import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./client";

const MIGRATIONS_DIR = join(import.meta.dir, "migrations");

export async function runMigrations(db: Db, dir: string = MIGRATIONS_DIR): Promise<string[]> {
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

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await Bun.file(join(dir, file)).text();
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
