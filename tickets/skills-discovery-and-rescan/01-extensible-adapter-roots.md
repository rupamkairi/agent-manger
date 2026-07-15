---
id: skills-discovery-and-rescan-01
title: Restructure adapters into a declarative registry and add missing skill roots
status: done
depends_on: []
spec: specs/skills-discovery-and-rescan.md
---

## Goal
The scanner discovers skills from all known install locations, including the
agents-standard directories used by `npx skills add`. Adding a new agent is a
single registry entry.

## Scope
- Restructure `packages/server/src/adapters/` so each adapter is a declarative
  entry registered in `packages/server/src/adapters/registry.ts`: name,
  detection, `globalSkillRoots`, `projectSkillRoots`, with room for
  config/instruction roots later. The scanner
  (`packages/server/src/scanner/scan.ts`) iterates registry entries only.
- Add an "agents-standard" shared source with roots `~/.agents/skills`
  (global) and `.agents/skills` (project). Skills found only here show
  Agent = "Shared" in the UI.
- Add native roots to existing adapters: Codex `~/.codex/skills` and
  `.codex/skills` (`packages/server/src/adapters/codex.ts`); OpenCode
  equivalents (`packages/server/src/adapters/opencode.ts`).

## Acceptance criteria
- [ ] A global rescan indexes skills present in `~/.agents/skills`.
- [ ] A project rescan indexes skills present in `<project>/.agents/skills`.
- [ ] Skills found only in agents-standard roots display Agent = "Shared".
- [ ] Codex and OpenCode adapters declare non-empty native skill roots.
- [ ] Adding a hypothetical new agent requires touching only the registry
      (no changes in `scanner/`).

## Out of scope
- Symlink dedup (ticket 02).
- Any UI changes beyond the "Shared" agent label.
