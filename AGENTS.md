# AGENTS.md

Harbor is a local-first control panel for discovering, inspecting, configuring,
and maintaining AI coding agents (Claude Code, Codex, OpenCode) and their
resources — skills, instructions, memory, configs — plus workflows, jobs,
schedules, and a web terminal. Bun monorepo; Svelte 5 SPA frontend.

## Layout

- `apps/web` — Svelte 5 + shadcn-svelte SPA (`src/pages`, `src/lib`)
- `packages/shared` — Zod contracts + constants; single source of truth for API shapes
- `packages/server` — Bun HTTP API (`/api/v1`), scanner, adapters, workflows, terminal.
  DB: `bun:sqlite` backend for local mode (`db/client.ts`); `@libsql/client`
  only via lazy import when sync is configured (keeps `bun build --compile`
  working). Migrations are statically embedded text imports — add new ones
  to the manifest in `db/migrate.ts`, not just the folder.
- `packages/cli` — `harbor serve|service|mcp` (`packages/cli/src/index.ts`)
- `packages/mcp` — 8 read-only MCP tools over the HTTP API
- `specs/`, `tickets/` — feature specs and implementation tickets

## Ports & env (Harbor defaults)

- Backend: **11123** (`HARBOR_PORT`), frontend dev server: **11124** (proxies `/api`, `/ws` → 11123)
- `HARBOR_HOME` (default `~/.harbor`), `HARBOR_DB_PATH` (`harbor.db`), `HARBOR_URL` (MCP client)

## Commands

- `bun run dev` — API server (watch, API-only) + web UI together; `dev:server` / `dev:web` individually
- `bun run harbor serve` — canonical server entry: API only; add `--serve-ui` to also serve the built web UI, `--open` to launch the browser
- `bun run harbor <service|mcp>` — OS service mgmt, MCP server
- `bun run typecheck` — tsc on all packages + `apps/web check`
- `bun run package` — web build + `dist/harbor` single binary + `dist/web-dist` sidecar.
  Binary runs without Bun (`HARBOR_HOME`/`HARBOR_PORT` supported); needs the
  `web-dist` sibling dir for `--serve-ui`
- Server entry: `bun packages/server/src/index.ts` (API-only dev; composable `startApp` in `packages/server/src/app.ts`)

## Conventions

- Import workspace code via `@harbor/shared`, `@harbor/server/app`, `@harbor/server/lockfile`
- All write paths must go through path-guard containment + staging guards in `packages/server/src`
- Resource edits use ifHash optimistic concurrency; skill installs validate before staging
- Keep UI calm/precise per `apps/web/PRODUCT.md`; no dark hacker-console styling
- Single-instance lockfile at `<harborHome>/harbor.lock`

## Known issues (pre-existing, not regressions)

- `apps/web check` fails on `WorkflowEditor.svelte` (`Snapshot<T>` assignability) — fails on clean tree too
- `GET /api/v1/health` returns 500: zod rejects the `shared` skill source against the agent enum
