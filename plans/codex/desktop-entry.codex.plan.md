# Fix Desktop Dev Entry Loading Stale UI

## Summary

Make `pnpm dev` refresh Vite output before launching Deno Desktop so the desktop window does not load stale `dist` assets.

## Changes

- Keep `package.json` `dev` as `deno task dev:desktop`.
- Remove top-level `name` and `version` from `deno.json` to avoid Deno package export warnings.
- Change `deno.json` `dev:desktop` to `vite build && deno desktop --hmr .`.
- Keep `build:desktop` as `vite build && deno desktop --output ./dist/AIResourceManager.app .`.

## Verification

- Static verify task wiring only.
- Do not run dev, build, preview, check, lint, or format unless requested.
