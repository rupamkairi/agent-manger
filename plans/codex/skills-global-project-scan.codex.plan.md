# Skills Global + Project Scan Plan

## Summary

Fix Skills so it scans both global and project skill roots, then shows scope and duplicate names correctly.

## Scope

- Claude, Codex, OpenCode
- Global + project + shared `.agents/skills`
- Inventory only
- Skip install/import/delete for now

## Steps

1. Trace current scan flow end to end.
2. Add global skill-root scan from verified home paths.
3. Keep project scan, but normalize both sources into one skill model.
4. Mark each skill with `scope`, `agentTarget`, `location`, `status`, and duplicate-name info.
5. Merge results in desktop API and app state without breaking selection.
6. Update Skills table + details panel to show global vs project clearly.
7. Add tests for global roots, project roots, shared roots, missing `SKILL.md`, and duplicate names.

## Verification

- Static review first
- Run tests only if you ask
- No dev/build/check/lint/format
