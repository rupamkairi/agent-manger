<script lang="ts">
  import {
    Activity,
    Bot,
    BookOpen,
    CircleHelp,
    Database,
    FileText,
    Folder,
    LayoutDashboard,
    Settings,
    Zap,
  } from "@lucide/svelte";
  import type { Component } from "svelte";
  import type { PageId } from "../../../shared/types/resource";
  import { getCurrentPage, setCurrentPage } from "$lib/stores/app-state.svelte";

  type NavItem = {
    id: PageId;
    label: string;
    icon: Component;
  };

  const groups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "Workspace",
      items: [
        { id: "dashboard", label: "Dashboard 🚧", icon: LayoutDashboard },
        { id: "projects", label: "Projects", icon: Folder },
      ],
    },
    {
      label: "Resources",
      items: [
        { id: "agents", label: "Agents", icon: Bot },
        { id: "skills", label: "Skills", icon: Zap },
        { id: "instructions", label: "Instructions", icon: FileText },
        { id: "memory", label: "Memory 🚧", icon: Database },
      ],
    },
    {
      label: "System",
      items: [
        { id: "health", label: "Health", icon: Activity },
        { id: "settings", label: "Settings 🚧", icon: Settings },
      ],
    },
  ];
</script>

<aside class="flex w-52 shrink-0 flex-col border-r border-outline-variant bg-background">
  <div class="px-4 pb-4 pt-5">
    <div class="text-lg font-semibold text-primary">Workspace</div>
    <div class="mt-0.5 text-path text-on-surface-variant">v1.0.4-stable</div>
  </div>

  <nav class="flex-1 overflow-auto">
    {#each groups as group}
      <section class="mb-3">
        <div class="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-outline">{group.label}</div>
        {#each group.items as item}
          <button
            class={`flex h-9 w-full items-center gap-2.5 border-r-2 px-4 text-left text-sm font-semibold transition-all ${
              getCurrentPage() === item.id
                ? "border-primary bg-accent text-primary"
                : "border-transparent text-on-surface-variant hover:bg-accent hover:text-on-surface"
            }`}
            onclick={() => setCurrentPage(item.id)}
          >
            <item.icon class="size-4" />
            {item.label}
          </button>
        {/each}
      </section>
    {/each}
  </nav>

  <div class="border-t border-outline-variant px-4 py-4">
    <button class="flex h-9 w-full items-center gap-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
      <BookOpen class="size-4" />
      Docs
    </button>
    <button class="flex h-9 w-full items-center gap-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
      <CircleHelp class="size-4" />
      Support
    </button>
  </div>
</aside>
