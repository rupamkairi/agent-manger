# 01 — bun:sqlite local backend, @libsql lazy for sync

## Why

`bun build --compile` bundles fine but the binary crashes at boot:
`@libsql/client` loads its native binding through a computed
`require()` (`@neon-rs/load` → `@libsql/<platform>-<arch>`) that the
compiler cannot bundle. Verified: binary fails with
`Cannot find module '@libsql/darwin-arm64'` even with the native
package installed. Type-only `@libsql` imports are fine (erased);
only the runtime import in `packages/server/src/db/client.ts` blocks.

## Scope

- `packages/server/src/db/client.ts`: define `DbClient` / `DbTx` /
  `ExecuteResult` interfaces covering exactly what the codebase uses
  (`execute`, `transaction` + commit/rollback, optional `sync()`,
  `close()`); implement a `bun:sqlite` backend (default, local);
  load `@libsql/client` via dynamic `import()` only when sync is
  configured. `createDb` becomes async.
- Value normalization at the boundary: boolean → 0/1, Date → ISO,
  undefined → null (bun:sqlite binding subset).
- Update callers of `createDb`: `app.ts` (`await`), 5 test files
  (`backend-audit`, `file-write`, `schedule`, `skills-write`,
  `workflow-engine`).
- `sync/manager.ts`: guard `client.sync?.()` — record a status error
  when the backend has no sync (local backend).

## Out of scope

- Changing SQL, schemas, or query call sites (positional `?`
  bindings everywhere — no named bindings in the codebase).
- Touching the existing type-only `InValue` imports (erased, harmless).

## Acceptance

- `bun run typecheck` green (except known pre-existing web error).
- `bun test packages/server` fully green.
- Dev server boots, `/api/v1/health` returns ok:true.
