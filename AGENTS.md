# AGENTS.md

This repo is a simple Deno Desktop + Svelte + Vite + TypeScript + Tailwind + shadcn-svelte starter.
Output Very Short & Concise,

Sacrifice grammer for the sake of Concision.

## Plan Mode

Always store plan in the `/plans/<agent-name>/*` with their respective filename extensions.

Example -

1. Codex should store in `/plans/codex/*.codex.plan.md`.
1. OpenCode should store in `/plans/opencode/*.oc.plan.md`.

## Where things live

- `plans/*` for Documentation, PRD, Design Docs, Work Plans, Development Plans etc...
- `package.json`
- `deno.json`
- `components.json`
- `src/desktop`
- `src/frontend`
- `src/shared`

## Work rules

- Reuse the existing Svelte/Tailwind/shadcn-svelte setup. Follow Latest Svelte docs for Guidelines for Component composition, State Management.
- Follow SOLID Principles.
- Follow YAGNI.
- Features that are marked WIP - must be disabled with "🚧" sign.
- At the same time Multiple agents could be working on this Project & changing files. Sometime Multiple agent could be working on the same file, in those cases try not to create conflicts, remove other's work.

## Checks

- Always assume dev command running, so never run that.
- Never run build, preview, check, lint, format. User will ask you to do these if needed.
- Do not write tests & run them by default. If asked for some particular feature only then do so.
- Never run git commit or git push by your own. User will ask you to if needed.
- When User asked to commit, commit everything by default, User will define otherwise.
