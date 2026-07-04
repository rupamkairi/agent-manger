# agent-manager — Visual Layout

## App Shell

Main layout:

- Left Sidebar
- Main Content
- Right Details Panel
- Bottom Status Bar
- Integrated Terminal Drawer

---

# 2. Left Sidebar

## Sections

### Workspace

- Dashboard
- Projects

### Resources

- Agents
- Skills
- Instructions
- Memory

### System

- Health
- Terminal
- Settings

---

# 3. Status Bar

## Items

Left side:

- Selected project
- Scan status
- Resource count

Right side:

- Detected agents count
- Warnings count
- Terminal status

Example:

`Project: agent-manager | Scan: Complete | Agents: 3 | Warnings: 2`

---

# 4. Main Content Sections

## Dashboard

Purpose:
Show overall state.

Widgets:

- Projects count
- Installed agents count
- Skills count
- Instruction files count
- Warnings count
- Last scan time

Tabs:

- Overview
- Recent Resources
- Warnings

---

## Projects

Purpose:
Manage opened project folders.

Main content:

- Project list
- Project path
- Last scanned
- Resource summary
- Refresh button

Tabs:

- Overview
- Resources
- Settings

Actions:

- Add Project
- Remove Project
- Refresh Scan
- Open in Terminal

---

## Agents

Purpose:
Show detected agents and their resource paths.

Main content:

- Agent list
- Installed/missing status
- Version
- Binary path
- Known resource paths

Tabs:

- Installed
- Missing
- Resource Paths
- Command Check

Actions:

- Refresh Detection
- Check Commands
- Open Config Path

---

## Skills

Purpose:
Manage global and project skills.

Main content:

- Skills table
- Skill name
- Description
- Scope
- Agent target
- Location
- Validation status

Tabs:

- All Skills
- Global
- Project
- Invalid
- Duplicates

Actions:

- Import Skill
- Install Skill
- Delete Skill
- Validate Skill
- Open `SKILL.md`
- Open Skill Folder

---

## Instructions

Purpose:
Manage prompt and instruction files.

Main content:

- Instruction file list
- File path
- Scope
- Agent target
- Last modified
- Status

Tabs:

- All
- Global
- Project
- Claude
- Codex
- Cursor / Others

Actions:

- Create File
- Edit File
- Rename File
- Delete File
- Open File Location

---

## Memory

Purpose:
Manage memory files.

Phase:
V1 Phase 2

Main content:

- Memory file list
- Agent target
- Scope
- Location
- Size
- Last modified
- Status

Tabs:

- All
- Global
- Project
- Agent-specific
- Warnings

Actions:

- Create Memory File
- Edit Memory File
- Delete Memory File
- Open File Location

---

## Health

Purpose:
Show resource problems.

Main content:

- Warning list
- Affected resource
- Severity
- Reason
- Suggested fix

Tabs:

- All
- Skills
- Instructions
- Agents
- Memory

Severity:

- Info
- Warning
- Error
- Unknown

Actions:

- Recheck
- Open Resource
- Ignore Warning

---

## Terminal

Purpose:
Manual terminal for selected project.

Main content:

- Terminal shell
- Project selector
- Clear output
- Copy output

Tabs:

- Terminal 1
- Terminal 2
- New Terminal

Actions:

- New Terminal
- Close Terminal
- Change Working Directory

---

## Settings

Purpose:
Global and per-project settings.

Tabs:

- App
- Projects
- Agents
- Resource Paths
- Appearance
- Terminal

App Settings:

- Default project folder
- App data location
- Theme

Agent Settings:

- Known agent paths
- Resource scan paths

Project Settings:

- Enabled scan paths
- Ignored folders
- Preferred agents

Terminal Settings:

- Default shell
- Terminal font
- Terminal start directory

---

# 5. Right Details Panel

Purpose:
Show selected item details without changing page.

Used for:

- Agent detail
- Skill detail
- Instruction file detail
- Memory file detail
- Health warning detail

Skill Detail:

- Name
- Description
- Scope
- Agent target
- Path
- Validation result
- Files inside skill
- Actions

Instruction Detail:

- File path
- Scope
- Agent target
- Last modified
- Preview
- Actions

Agent Detail:

- Installed status
- Version
- Binary path
- Config paths
- Resource paths
- Command check result

---

# 6. Editor View

Used for:

- Instruction files
- Skill files
- Memory files

Layout:

- File header
- Markdown/code editor
- Preview tab
- Save button
- Dirty state indicator

Tabs:

- Edit
- Preview
- Raw

Actions:

- Save
- Revert
- Delete
- Open Location

---

# 7. Skill Install Flow

Steps:

1. Select skill source
2. Validate skill
3. Select target agent
4. Select scope: global/project
5. Confirm install

Screens:

- Source
- Validation
- Target
- Confirm
- Result

---

# 8. Import Skill Flow

Sources:

- Local folder
- ZIP file
- GitHub repo/folder

Steps:

1. Choose source
2. Load skill
3. Validate
4. Select install target
5. Install

---

# 9. Navigation Priority

Primary sidebar order:

1. Dashboard
2. Projects
3. Agents
4. Skills
5. Instructions
6. Memory
7. Health
8. Terminal
9. Settings

Reason:
User first sees system state, then manages resources.
