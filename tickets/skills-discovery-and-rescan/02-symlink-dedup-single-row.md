---
id: skills-discovery-and-rescan-02
title: Dedupe symlinked skills into a single row listing linked agents
status: done
depends_on: [skills-discovery-and-rescan-01]
spec: specs/skills-discovery-and-rescan.md
---

## Goal
A skill installed in `.agents/skills` and symlinked into agent directories
(e.g. `~/.claude/skills`) appears as one row that names every agent it is
configured for.

## Scope
- In the scanner (`packages/server/src/scanner/scan.ts` and
  `packages/server/src/scanner/skills.ts`), resolve each skill directory's
  real path. Merge entries that share a real path into one record whose
  canonical location is the real one (typically under `.agents/skills`).
- Store the list of agents the skill is symlinked into and expose it through
  the skills API (`packages/server/src/http/routes/skills.ts`,
  `packages/shared/src/schemas/skill.ts`).
- In `apps/web/src/pages/SkillsPage.svelte`, the Agent column of a merged row
  lists agent names (e.g. "Claude Code, Codex"). Do not show the
  repository/source path in that column.
- Duplicate-name warnings (`scan.ts` duplicate check) must not fire for
  symlinked copies; they fire only for genuinely distinct skills sharing a
  name within the same scope.

## Acceptance criteria
- [ ] A skill in `~/.agents/skills` symlinked into `~/.claude/skills` shows
      exactly one row after a global rescan.
- [ ] That row's Agent column lists all linked agents by name.
- [ ] No `duplicate-name` issue is recorded for symlinked copies.
- [ ] Two unrelated skills with the same name still get the duplicate-name
      warning.

## Out of scope
- The Rescan button (ticket 03).
- Changing how broken symlinks are reported (existing `broken-symlink` issue
  stays as is).
