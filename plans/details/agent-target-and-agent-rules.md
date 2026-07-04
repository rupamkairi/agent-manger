### Target Agents

In Scope:

- Claude Code
- Codex
- OpenCode
- Pi

Out of Scope:

- Gemini CLI
- Aider
- Cursor CLI
- Cline
- Roo
- Windsurf
- Cursor rules
- GitHub Copilot instruction files
- Other agent/editor-specific systems

---

### Files / Folders to Detect

Only detect resources for the in-scope agents.

---

## 1. Claude Code Detection Rules

### Instruction Files

Detect:

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/settings.json`
- `.claude/settings.local.json`

### Skill Folders

Detect:

- `~/.claude/skills/*`
- `<project>/.claude/skills/*`

### Skill File Rule

A valid skill folder should contain:

- `SKILL.md`

### Scope

- Global: `~/.claude/*`
- Project: `<project>/.claude/*` or `<project>/CLAUDE.md`

---

## 2. Codex Detection Rules

### Instruction Files

Detect:

- `AGENTS.md`
- `AGENTS.override.md`
- `~/.codex/AGENTS.md`
- `~/.codex/AGENTS.override.md`
- `~/.codex/config.toml`

### Skill Folders

Detect known/default Codex skill locations only after verification.

Expected candidates:

- `~/.codex/skills/*`
- `<project>/.codex/skills/*`
- `<project>/.agents/skills/*`

### Skill File Rule

A valid skill folder should contain:

- `SKILL.md`

### Scope

- Global: `~/.codex/*`
- Project: `<project>/AGENTS.md`, `<project>/.codex/*`, `<project>/.agents/*`

---

## 3. OpenCode Detection Rules

### Instruction / Config Files

Detect:

- `opencode.json`
- `opencode.jsonc`
- `.opencode/*`
- `~/.config/opencode/*`

### Skill Folders

Detect:

- `~/.config/opencode/skills/*`
- `~/.opencode/skills/*`
- `<project>/.opencode/skills/*`
- `<project>/.agents/skills/*`
- `<project>/.claude/skills/*`

OpenCode documents reusable `SKILL.md`-based agent skills from home or repo locations. [oai_citation:0‡OpenCode](https://opencode.ai/docs/skills/?utm_source=chatgpt.com)

### Skill File Rule

A valid skill folder should contain:

- `SKILL.md`

### Scope

- Global: user config/home locations
- Project: `<project>/.opencode/*`, `<project>/.agents/*`, `<project>/.claude/*`

---

## 4. Pi Detection Rules

### Instruction / Config Files

Detect only verified Pi-specific files after checking installed Pi docs/config.

Known fact:

- Pi supports skills.
- Pi skills are self-contained capability packages loaded on demand.
- Pi skills use documentation, workflows, helper scripts, and references. [oai_citation:1‡Pi Dev](https://pi.dev/docs/latest/skills?utm_source=chatgpt.com)

### Skill Folders

Detect after verification:

- Pi global skill path
- Pi project skill path
- Shared `.agents/skills/*` if supported by installed Pi version

### Skill File Rule

Expected skill format:

- `SKILL.md`

But exact local folder paths should be verified from the installed Pi version before hardcoding.

### Scope

- Global: unknown until verified
- Project: unknown until verified

---

## 5. Shared Agent Skill Detection

Detect shared agent-skill folders only for in-scope agents:

- `<project>/.agents/skills/*`
- `~/.agents/skills/*`

Rule:

- Treat `.agents/skills/*` as shared skill source.
- Do not assume every agent supports it.
- Show compatibility as:
  - Supported
  - Unsupported
  - Unknown
  - Needs verification

---

## 6. Removed From Detection Scope

Do not scan these in V1:

- `.cursor/rules/*`
- `.clinerules`
- `.windsurfrules`
- `.github/copilot-instructions.md`
- Cursor CLI config
- Cline config
- Roo config
- Windsurf config
- Gemini CLI config
- Aider config

Reason:

These agents/editors are out of current scope.

---

## 7. Final Files / Folders to Detect

### Claude Code

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/skills/*`
- `~/.claude/skills/*`

### Codex

- `AGENTS.md`
- `AGENTS.override.md`
- `~/.codex/AGENTS.md`
- `~/.codex/AGENTS.override.md`
- `~/.codex/config.toml`
- Codex skill paths after verification
- `.agents/skills/*` if supported

### OpenCode

- `opencode.json`
- `opencode.jsonc`
- `.opencode/*`
- `~/.config/opencode/*`
- `.opencode/skills/*`
- `.agents/skills/*`
- `.claude/skills/*`

### Pi

- Pi config paths after verification
- Pi skill paths after verification
- `.agents/skills/*` only if installed Pi version supports it

---

## 8. Detection Output

For every detected resource, store:

- Resource type
- Agent target
- Scope: global/project/shared
- Path
- Exists/missing
- Valid/invalid/unknown
- Last modified
- Source agent
- Compatibility status

---

## 9. Rule

Never mark a resource as supported unless confirmed for that agent.

Use:

- Confirmed
- Likely
- Unknown
- Unsupported

This avoids misleading users.
