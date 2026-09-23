# 02 — Embed migrations, sidecar web dist, package script

## Why

Two more compile blockers after the DB swap: `migrate.ts` discovers
`.sql` files with `readdirSync(import.meta.dir)` (virtual `/$bunfs`
path in the binary), and `static.ts` resolves `apps/web/dist`
relative to source (missing in the binary).

## Scope

- `db/migrate.ts`: replace directory scan with a static manifest of
  `import ... with { type: "text" }` SQL imports (ordered array).
  Add `db/sql.d.ts` (`declare module "*.sql"`) for tsc.
  Drop the `dir` param (no caller passes one).
- `static.ts`: resolve the web root from candidates — source-relative
  `apps/web/dist` first, then `<execPath>/web-dist` sidecar (used when
  running compiled). Serve from the first existing root.
- Root `package.json`: `package` script — build web, compile
  `packages/cli/src/index.ts` to `dist/harbor`, copy
  `apps/web/dist` → `dist/web-dist`.

## Acceptance

- Dev behavior unchanged (same migrations applied, same UI served).
- `bun run package` produces `dist/harbor` + `dist/web-dist`.
