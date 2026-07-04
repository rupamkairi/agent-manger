# Design System + Desktop Resource Manager Execution Plan

## Summary

Implement the dark desktop Agent Manager design system, resource-manager shell, page set, and Deno scanner boundary from the approved plan.

## Steps

1. Add this plan file before source edits.
2. Add scanner-facing types and tests for skill validation/detection behavior.
3. Add a Deno scanner module for Claude Code, Codex, and OpenCode resource paths.
4. Replace frontend tokens with dark design tokens, font-face rules, and desktop scrollbar/focus styling.
5. Rework app state around projects, agents, resources, warnings, terminal logs, selected page/resource, and panel state.
6. Compose reusable desktop UI components for shell, topbar, sidebar, details panel, status bar, terminal drawer, tabs, badges, metrics, tables, file explorer, and editor.
7. Replace all routes with dashboard, projects, agents, skills, instructions, memory, health, terminal, and settings screens using shared components.
8. Verify by static review only unless the user requests build/check/lint/format.

## Constraints

- Do not run dev, build, preview, check, lint, or format.
- No Google font runtime import.
- Pi excluded for V1.
- UI must keep dense desktop behavior and use shared design-system components.
