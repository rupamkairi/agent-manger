# Project Setup Plan

Stack: Deno Desktop + Svelte + Vite + TypeScript + Tailwind + shadcn-svelte

## 0. Notes

Deno Desktop is new.
It is available from Deno 2.9 and bundles a Deno app into a native desktop app with Deno runtime + webview/rendering backend. Use it as experimental until stable.

Refs:

- Deno Desktop docs
- Svelte + Vite docs
- shadcn-svelte Vite setup docs

---

## 1. Target Starter Shape

agent-manager/
├─ src/
│ ├─ desktop/
│ │ └─ main.ts
│ ├─ frontend/
│ │ ├─ main.ts
│ │ ├─ App.svelte
│ │ ├─ app.css
│ │ └─ lib/
│ │ ├─ components/
│ │ │ └─ ui/
│ │ ├─ stores/
│ │ ├─ routes/
│ │ └─ utils/
│ └─ shared/
│ ├─ types/
│ └─ constants/
├─ public/
├─ deno.json
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ components.json
├─ .gitignore
└─ README.md

---

## 2. Setup Steps

### Step 1: Create Vite + Svelte + TypeScript project

Command:

pnpm create vite agent-manager --template svelte-ts

Then:

cd agent-manager
pnpm install

Why:
Use Vite as frontend build/dev server.
Keep Deno Desktop as desktop runtime/bundler layer.

---

### Step 2: Add Deno config

Create:

deno.json

Purpose:

- Deno tasks
- permissions
- desktop commands
- formatter/linter config

Example tasks:

{
"tasks": {
"dev:web": "vite",
"build:web": "vite build",
"desktop:dev": "deno desktop --hmr src/desktop/main.ts",
"desktop:build": "deno desktop --output AIResourceManager src/desktop/main.ts",
"check": "deno check src/desktop/main.ts",
"fmt": "deno fmt",
"lint": "deno lint"
}
}

---

### Step 3: Create Deno Desktop entry

Create:

src/desktop/main.ts

Purpose:

- Start desktop window
- Load Vite dev server in dev
- Load built frontend in production
- Later expose safe APIs for filesystem/resource scanning

For now:

- Keep it minimal
- No app logic
- No scanning
- No agent logic

---

### Step 4: Add Tailwind

Use shadcn-svelte Vite guide path.

Install Tailwind for Svelte/Vite.

Expected files:

src/frontend/app.css
vite.config.ts

Tailwind setup should include:

- Tailwind Vite plugin/config
- global CSS import
- CSS variables support for shadcn-svelte theme

---

### Step 5: Add shadcn-svelte

Run:

pnpm dlx shadcn-svelte@latest init

Choose:

- TypeScript: yes
- Tailwind: yes
- Base color: neutral or zinc
- CSS file: src/frontend/app.css
- Components path: src/frontend/lib/components
- Utils path: src/frontend/lib/utils

Add starter components:

pnpm dlx shadcn-svelte@latest add button
pnpm dlx shadcn-svelte@latest add card
pnpm dlx shadcn-svelte@latest add input
pnpm dlx shadcn-svelte@latest add tabs
pnpm dlx shadcn-svelte@latest add dialog
pnpm dlx shadcn-svelte@latest add dropdown-menu
pnpm dlx shadcn-svelte@latest add separator
pnpm dlx shadcn-svelte@latest add scroll-area
pnpm dlx shadcn-svelte@latest add resizable

---

## 3. Frontend Starter Layout

Create simple shell only.

No real logic.

App layout:

App.svelte
├─ Sidebar
│ ├─ Projects
│ ├─ Agents
│ ├─ Skills
│ ├─ Instructions
│ └─ Settings
├─ Topbar
└─ Main Panel

Initial pages/placeholders:

src/frontend/lib/routes/
├─ projects.svelte
├─ agents.svelte
├─ skills.svelte
├─ instructions.svelte
└─ settings.svelte

No routing library needed initially.
Use local selected tab/store.

---

## 4. Suggested Starter UI Components

Create:

src/frontend/lib/components/app-sidebar.svelte
src/frontend/lib/components/app-topbar.svelte
src/frontend/lib/components/app-shell.svelte
src/frontend/lib/components/empty-state.svelte
src/frontend/lib/components/page-header.svelte

Purpose:
Only structure.
No business logic.

---

## 5. Styling Direction

Use:

- Tailwind
- shadcn-svelte tokens
- CSS variables
- dark mode ready
- desktop-style layout

Starter layout:

- Left sidebar: 260px
- Topbar: 48px
- Main content: full height
- Panels/cards for content
- Resizable later

---

## 6. Package Choices

Required:

- svelte
- vite
- typescript
- tailwindcss
- shadcn-svelte
- lucide-svelte
- clsx
- tailwind-merge

Optional but useful later:

- bits-ui
- mode-watcher
- svelte-sonner
- vaul-svelte
- zod
- xterm
- monaco-editor

Do not add optional packages in starter unless needed.

---

## 7. Scripts

package.json:

{
"scripts": {
"dev": "vite",
"build": "vite build",
"preview": "vite preview",
"check": "svelte-check --tsconfig ./tsconfig.json"
}
}

deno.json:

{
"tasks": {
"dev:web": "vite",
"build:web": "vite build",
"desktop:dev": "deno desktop --hmr src/desktop/main.ts",
"desktop:build": "deno desktop --output AIResourceManager src/desktop/main.ts",
"fmt": "deno fmt",
"lint": "deno lint"
}
}

---

## 8. Dev Flow

Frontend only:

pnpm dev

Desktop dev:

deno task desktop:dev

Build frontend:

pnpm build

Build desktop:

deno task desktop:build

---

## 9. Initial Git Setup

Create:

.gitignore

Include:

node*modules
dist
dist-ssr
.vite
.DS_Store
.env
.env.\*
*.log
AIResourceManager
\_.app

---

## 10. First Commit Scope

Commit message:

chore: setup deno desktop svelte starter

Contains only:

- Vite Svelte TypeScript setup
- Tailwind setup
- shadcn-svelte setup
- Deno Desktop entry
- Basic app shell
- Placeholder pages
- Config files

No app logic.
No resource scanning.
No agent detection.
No skill management.
