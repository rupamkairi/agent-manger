# Spec: Skills Discovery, Rescan, and Wider File Sheet

Date: 2026-07-15
Status: Approved via grill session, ready to implement

## Problem

Skills installed with `npx skills add` go into `~/.agents/skills` (global) and
`<project>/.agents/skills` (project). Weave never shows them because the
scanner only reads skill roots declared by agent adapters, and only the
Claude Code adapter declares any (`~/.claude/skills`, `.claude/skills`).
Codex and OpenCode adapters declare empty roots. The Skills page also has no
Rescan control; its empty state points users to other pages.

## Decisions (from grill session)

1. `.agents/skills` is modeled as a shared "agents standard" source, not
   duplicated per agent.
2. Codex and OpenCode get their native skill roots now. Adapters must be
   restructured so adding a new agent (name, detection, roots) is a single
   declarative registry entry.
3. Rescan button is scope-aware: project selected → rescan that project only;
   global view → rescan global roots only.
4. Skills page only. No rescan on Instructions, Memory, Configs, Workflows,
   or Jobs pages.
5. Editing skill content is OUT of scope (no write endpoint). Follow-up task.
6. Symlinked copies dedupe to a single row. The row shows the names of all
   agents the skill is configured for (via symlink), not the repository path.

## Task 1: Extensible adapter roots and shared source

- Restructure `packages/server/src/adapters/` so each adapter is a
  declarative entry registered in `registry.ts`: name, detection,
  `globalSkillRoots`, `projectSkillRoots` (room for config/instruction roots
  later). The scanner iterates registry entries; adding an agent requires no
  scanner changes.
- Add an "agents-standard" shared source with roots `~/.agents/skills` and
  `.agents/skills`. Skills found only here show Agent = "Shared".
- Add native roots: Codex `~/.codex/skills` + `.codex/skills`; OpenCode
  equivalents.

## Task 2: Symlink dedup, single row per skill

- Resolve each skill directory's real path during scan. Entries sharing a
  real path merge into one row whose canonical location is the real one
  (typically `.agents/skills`).
- The Agent column of a merged row lists all agents the skill is symlinked
  into, e.g. "Claude Code, Codex". Do not show the repository/source path in
  that column.
- Duplicate-name warnings fire only for genuinely distinct skills with the
  same name, never for symlinked copies.

## Task 3: Rescan button on the Skills page

- Scope-aware button in the Skills page header and in the empty state:
  - Project selected → `POST /api/v1/projects/:id/rescan`
  - Global view → `POST /api/v1/scan/global`
- Both endpoints already exist (`packages/server/src/http/routes/projects.ts`).
  This is UI wiring in `apps/web/src/pages/SkillsPage.svelte`: spinner while
  scanning, refetch skills list on completion.

## Task 4: Wider right sheet for file content

- The right-side sheet that shows file contents (AGENTS.md / CLAUDE.md /
  SKILL.md), `apps/web/src/lib/components/resources/FileResourcePage.svelte`
  line ~277, currently uses default width (view) and `sm:max-w-2xl` (edit).
- When file content is displayed, make the sheet roughly 2x wider, with the
  current size as the minimum width. Applies whenever there is file content
  to view or edit.

## Out of scope

- Editing skill content in-app (needs `PUT /api/v1/resources/:id/content`).
- Rescan on other resource pages.
- Specific skills or their behavior; this is about discovery infrastructure.
