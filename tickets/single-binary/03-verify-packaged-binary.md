# 03 — Verify packaged binary

## Scope

With an isolated `HARBOR_HOME` and non-default port (never the dev
11123):

1. `dist/harbor serve` boots, applies migrations, `/api/v1/health`
   returns ok:true, `/api/v1/projects` and `/api/v1/agents` return ok.
2. `dist/harbor serve --serve-ui` serves the UI HTML at `/` from the
   `web-dist` sidecar.
3. `dist/harbor --version` works.
4. No `bun` on PATH required (same shell, `which bun` hidden —
   best-effort check).

## Acceptance

All four pass. Record the exact commands + output in the final
summary. Any failure reopens ticket 01 or 02.
