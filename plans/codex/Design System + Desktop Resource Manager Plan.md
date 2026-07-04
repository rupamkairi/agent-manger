# Design System + Desktop Resource Manager Plan

## Summary

Build the app around the provided dark desktop design: dense panes, 1px borders, Geist UI font, JetBrains Mono data font, bottom terminal, status bar, right details panel, and real Deno scanner state.

Plan file to create first during execution: `plans/codex/design-system.codex.plan.md`.

## Key Changes

- Add bundled fonts under `public/fonts/`; no Google runtime import.
- Replace `src/frontend/app.css` tokens with dark shadcn/Tailwind v4 tokens from `plans/DESIGN.md`.
- Add semantic tokens: surfaces, borders, text, primary, success, warning, danger, terminal, focus, radius, spacing, typography.
- Rework shell into desktop layout:
  - top menu bar
  - 240px sidebar
  - main workspace
  - collapsible right details panel
  - resizable bottom terminal drawer
  - fixed bottom status bar
- Add pages from `visual-layout.md`: Dashboard, Projects, Agents, Skills, Instructions, Memory, Health, Terminal, Settings.
- Exclude Pi for V1. Scanner/UI scope: Claude Code, Codex, OpenCode.

## Components + State

- Core UI components:
  - `AppShell`, `AppSidebar`, `AppTopbar`, `StatusBar`, `TerminalDrawer`, `DetailsPanel`
  - `PageHeader`, `MetricGrid`, `DataTable`, `ResourceBadge`, `ValidationBadge`, `CommandBar`
  - `ResourceTabs`, `SplitPane`, `CodeEditorShell`, `FileExplorer`
- Stores:
  - current page, selected project, selected resource, terminal open/height
  - scan status, projects, agents, skills, instructions, memory files, warnings, logs
- Shared types:
  - `Project`, `Agent`, `Skill`, `InstructionFile`, `MemoryFile`, `Resource`, `Warning`, `ScanSummary`, `TerminalLine`
- Desktop API shape:
  - `detectAgents()`
  - `scanProject(path)`
  - `scanAllProjects()`
  - `openPath(path)`
  - `openTerminal(path)`
  - `readTextFile(path)`
  - `writeTextFile(path, content)`

## Scanner Plan

- Add Deno scanner layer for local filesystem reads.
- Detect:
  - Claude: `CLAUDE.md`, `.claude/*`, `~/.claude/skills/*`
  - Codex: `AGENTS.md`, `AGENTS.override.md`, `~/.codex/*`, `.codex/skills/*`, `.agents/skills/*`
  - OpenCode: `opencode.json`, `.opencode/*`, `~/.config/opencode/*`, `.opencode/skills/*`
- Validate skills by checking `SKILL.md`, name, description, metadata, referenced files, duplicate names.
- UI must show verified facts only; unknown support stays `Unknown`.

## Test / Acceptance

- Do not run dev/build/check/lint/format unless user asks.
- Verify by static review and existing running dev app if available.
- Acceptance:
  - dark tokens applied globally
  - no raw page-level color drift
  - all major pages use shared components
  - desktop shell matches reference layout direction
  - scanner-backed stores power tables/status
  - empty/loading/error/scanning states exist
  - terminal/status bar reflect scan actions
