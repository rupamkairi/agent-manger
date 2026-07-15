---
id: skills-discovery-and-rescan-04
title: Widen the right-side sheet when showing file content
status: done
depends_on: []
spec: specs/skills-discovery-and-rescan.md
---

## Goal
The right-side sheet that shows file contents (AGENTS.md, CLAUDE.md,
SKILL.md) is roughly twice as wide, so files are readable and editable
without cramping. The current width is the minimum.

## Scope
- `apps/web/src/lib/components/resources/FileResourcePage.svelte` (sheet at
  ~line 277): currently default width in view mode and `sm:max-w-2xl` in
  edit mode.
- Whenever file content is displayed (view or edit), make the sheet about
  2x its current width, with the current size as the minimum width.
- Keep responsive behavior sane on small screens (sheet must not overflow
  the viewport).

## Acceptance criteria
- [ ] Opening AGENTS.md / CLAUDE.md content shows a sheet roughly double the
      previous width on desktop.
- [ ] The sheet never renders narrower than its previous default size.
- [ ] On narrow viewports the sheet still fits the screen.

## Out of scope
- Sheet content or editing behavior changes.
- Other sheets (e.g. SkillDetailSheet) unless they render file content.
