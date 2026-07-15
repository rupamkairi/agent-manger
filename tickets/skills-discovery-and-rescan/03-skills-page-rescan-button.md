---
id: skills-discovery-and-rescan-03
title: Add scope-aware Rescan button to the Skills page
status: done
depends_on: []
spec: specs/skills-discovery-and-rescan.md
---

## Goal
Users can trigger a scan directly from the Skills page, scoped to what they
are viewing.

## Scope
- In `apps/web/src/pages/SkillsPage.svelte`, add a "Rescan" button in the
  page header and in the empty state.
- Behavior: project selected → `POST /api/v1/projects/:id/rescan`; global
  view → `POST /api/v1/scan/global`. Both endpoints already exist in
  `packages/server/src/http/routes/projects.ts`.
- Add the two calls to `apps/web/src/lib/api/endpoints.ts` if not already
  exposed there.
- Show a spinner/disabled state while scanning; refetch the skills list on
  completion.
- Update the empty-state copy so it points at the button instead of sending
  users to the Dashboard.

## Acceptance criteria
- [ ] With a project selected, clicking Rescan calls the project rescan
      endpoint only, and newly installed project skills appear.
- [ ] In global view, clicking Rescan calls the global scan endpoint only,
      and newly installed global skills appear.
- [ ] Button shows a loading state during the scan and the table refreshes
      after.
- [ ] Empty state contains the Rescan button.

## Out of scope
- Rescan controls on Instructions, Memory, Configs, Workflows, or Jobs pages.
- Editing skill content.
