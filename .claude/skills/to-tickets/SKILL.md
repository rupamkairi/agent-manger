---
name: to-tickets
description: Convert an approved spec document into small, actionable ticket files with scope, acceptance criteria, and dependencies. Use when the user says /to-tickets, asks to break a spec into tickets or tasks, or points at a file in specs/.
---

# To Tickets

Turn an approved spec into implementable tickets. One ticket = one reviewable unit of work (roughly one focused PR).

## Input

- A spec file path passed as the argument (e.g. `specs/skills-discovery-and-rescan.md`).
- If no path is given, list files in `specs/` and ask which one.
- Read the whole spec before writing anything. Respect its "Out of scope" section — never create tickets for it.

## Output

Write ticket files to `tickets/<spec-slug>/`:

```
tickets/skills-discovery-and-rescan/
├── 01-extensible-adapter-roots.md
├── 02-symlink-dedup.md
└── ...
```

Number tickets in dependency order. Each ticket file:

```md
---
id: <spec-slug>-01
title: Short imperative title
status: todo            # todo | in-progress | done
depends_on: []          # ids of tickets that must land first
spec: specs/<file>.md
---

## Goal
One or two sentences: what exists after this ticket is done.

## Scope
- Concrete changes, with file paths from the spec or codebase.

## Acceptance criteria
- [ ] Observable, checkable outcomes. No vague items.

## Out of scope
- Anything nearby that this ticket must NOT touch.
```

## Rules

- Keep tickets small. If a spec task has independent backend and UI parts, split them only when they can land separately; otherwise keep one ticket.
- Every acceptance criterion must be checkable by reading code or using the app. Never write "works correctly".
- Pull file paths from the spec when it names them; otherwise find the real paths in the codebase before writing the ticket. Never invent paths.
- Mirror the spec's decisions exactly. If something in the spec is ambiguous, ask the user before ticketing it — do not guess.
- After writing, print a short summary table: id, title, depends_on.
