# agent-manager — Detailed Feature Set

## Product Summary

agent-manager is a local-first desktop app for managing AI coding resources across multiple projects and agents.

It manages:

- Projects
- Agents
- Skills
- Prompts / instruction files
- Agent configs
- Memory files
- Global settings
- Per-project settings
- Terminal access

It does not manage git worktrees, run agent workflows, review diffs, or act as an AI coding IDE.

---

# V1 Phase 1 — Core AI Resource Management

## 1. Project Loader

### Capability

Open and manage multiple local project folders.

### Features

- Add project folder
- Remove project from app
- Rename display name
- Show project path
- Show last scanned time
- Refresh project scan
- Store project metadata locally

### Output

Each project becomes a scan target for AI-related resources.

---

## 2. Agent Detection

### Capability

Detect installed coding agents on the system.

### Features

- Detect known agent binaries
- Detect binary path
- Detect installed/missing state
- Detect version where possible
- Detect known global resource paths
- Refresh detection manually

### Target Agents

- Claude Code
- Codex
- OpenCode

Out of Scope Agents - Gemini CLI, Pi, Aider, Cursor CLI, Cline, Roo etc...

### Output

A clear list of installed and missing agents.

---

## 3. Global Resource Scanner

### Capability

Scan system-level AI resources.

### Features

- Scan global skill folders
- Scan global prompt/instruction files
- Scan global agent config files
- Detect invalid or unknown resources
- Show source path for each item

### Resource Scope

- Global
- Agent-specific

---

## 4. Project Resource Scanner

### Capability

Scan AI resources inside each opened project.

### Files / Folders to Detect

- `CLAUDE.md`
- `AGENTS.md`
- ... More of such listed in the plans/detials/agent-target-and-agent-rules.md
- Known agent config files

### Output

A project-level resource inventory.

---

## 5. Skills Viewer

### Capability

Show all detected skills.

### Features

- Show skill name
- Show description
- Show location
- Show scope: global/project
- Show target agent
- Show valid/invalid state
- Show duplicate skill names
- Open skill folder
- Open `SKILL.md`

### Output

A clean skill inventory across agents and projects.

---

## 6. Skill Install

### Capability

Install a skill into selected agent resource locations.

### Supported Install Targets

- Global install
- Project install
- One selected agent
- Multiple selected agents

### Rules

- Use each agent’s default supported skill structure
- Do not implement complex enable/disable behavior
- Install only to explicit selected targets

---

## 7. Skill Import

### Capability

Import skills from external/local sources.

### Sources

- Local folder
- GitHub repo/folder
- ZIP file

### Flow

1. Select source
2. Validate skill
3. Select agent target
4. Select global/project scope
5. Install skill

---

## 8. Skill Delete

### Capability

Delete a skill from a selected location.

### Features

- Delete from global agent location
- Delete from project location
- Delete only selected copy
- Confirm before delete

### Rule

Deleting one copy must not delete other agent/project copies.

---

## 9. Skill Validation

### Capability

Validate skill structure.

### Checks

- `SKILL.md` exists
- Skill name exists
- Skill description exists
- Required metadata exists
- Referenced files exist
- Folder structure is valid
- Duplicate skill names
- Unknown metadata fields

### Output

Validation status:

- Valid
- Warning
- Invalid
- Unknown

---

## 10. Plugin / Command Check

### Capability

Check whether an agent exposes plugin/skill commands.

### Checks

- `/plugin`
- `/skills`
- `/help`
- Agent-specific list command

### Status

- Supported
- Not supported
- Unknown
- Failed to verify

### Rule

Only show verified facts. Do not assume support.

---

## 11. Prompt / Instruction Viewer

### Capability

Show detected prompt and instruction files.

### Features

- Show file name
- Show file path
- Show scope
- Show target agent
- Show last modified time
- Show empty/non-empty state
- Show content preview
- Open file

### Supported Files

- `CLAUDE.md`
- `AGENTS.md`
- ... More of such listed in the plans/detials/agent-target-and-agent-rules.md

---

## 12. Prompt / Instruction Editor

### Capability

Create and edit instruction files.

### Features

- Create instruction file
- Edit file content
- Rename file
- Delete file
- Markdown editor
- Markdown preview
- Save changes
- Detect unsaved changes

### Rule

Editor is for prompt/instruction resources only.

---

## 13. Resource Health Check

### Capability

Detect obvious resource issues.

### Warnings

- Missing `SKILL.md`
- Invalid skill metadata
- Duplicate skill name
- Empty instruction file
- Possible prompt conflict
- Unknown agent path
- Missing referenced skill files
- Unsupported resource location

### Rule

Warnings should be conservative and clearly labeled.

---

## 14. Integrated Terminal

### Capability

Open a terminal in selected project folder.

### Features

- Select project
- Open shell
- Run manual commands
- Clear terminal
- Copy terminal output

### Rule

Terminal does not run agent workflows automatically.

---

## 15. Global App Settings

### Capability

Configure app-level behavior.

### Settings

- Default projects folder
- Known agent paths
- Resource scan paths
- Ignored folders
- Theme
- Terminal shell
- App data location

---

## 16. Per-Project Settings

### Capability

Configure project-specific resource behavior.

### Settings

- Enabled scan paths
- Ignored files/folders
- Preferred agents
- Project resource locations
- Prompt file preferences
- Skill install target preferences

---

# V1 Phase 2 — Memory Management

## 1. Memory Viewer

### Capability

Show detected memory files where supported.

### Features

- Show memory file path
- Show target agent
- Show scope
- Show last modified time
- Show file size
- Open memory file

---

## 2. Memory Scanner

### Capability

Scan known memory locations.

### Scope

- Global memory
- Project memory
- Agent-specific memory
- Machine-local memory

---

## 3. Memory Editor

### Capability

Create and edit memory files.

### Features

- Create memory file
- Edit memory content
- Delete memory file
- Markdown editor
- Save changes
- Detect unsaved changes

---

## 4. Memory Health Check

### Capability

Detect obvious memory issues.

### Warnings

- Large memory file
- Empty memory file
- Duplicate memory entries
- Stale project assumptions
- Unknown memory format

---

# Later Version

## Resource Creation

- Docs-to-skill generator
- Skill templates
- Prompt templates
- Memory templates
- Resource presets

## Resource Operations

- Copy resource
- Move resource
- Backup resource
- Restore resource

## Advanced Tooling

- MCP manager
- Basic project intelligence
- Agent profiles

## Optional Expansion

- Agent runner
- Task workflow
- Diff review
- Browser preview
- Cloud sync
- Team sharing
- In-app AI chat
- Automation rules
