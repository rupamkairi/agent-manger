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
    Terminal,
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
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "projects", label: "Projects", icon: Folder },
      ],
    },
    {
      label: "Resources",
      items: [
        { id: "agents", label: "Agents", icon: Bot },
        { id: "skills", label: "Skills", icon: Zap },
        { id: "instructions", label: "Instructions", icon: FileText },
        { id: "memory", label: "Memory", icon: Database },
      ],
    },
    {
      label: "System",
      items: [
        { id: "health", label: "Health", icon: Activity },
        { id: "terminal", label: "Terminal", icon: Terminal },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];
</script>

<aside class="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-background">
  <div class="px-5 pb-6 pt-7">
    <div class="text-xl font-semibold text-primary">Workspace</div>
    <div class="mt-1 text-path text-on-surface-variant">v1.0.4-stable</div>
  </div>

  <nav class="flex-1 overflow-auto">
    {#each groups as group}
      <section class="mb-4">
        <div class="px-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-outline">{group.label}</div>
        {#each group.items as item}
          <button
            class={`flex h-11 w-full items-center gap-3 border-r-2 px-5 text-left text-sm font-semibold transition-colors ${
              getCurrentPage() === item.id
                ? "border-primary bg-surface-high text-primary"
                : "border-transparent text-on-surface hover:bg-surface-high hover:text-primary"
            }`}
            onclick={() => setCurrentPage(item.id)}
          >
            <item.icon class="size-5" />
            {item.label}
          </button>
        {/each}
      </section>
    {/each}
  </nav>

  <div class="border-t border-outline-variant px-5 py-5">
    <button class="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface hover:text-primary">
      <BookOpen class="size-5" />
      Docs
    </button>
    <button class="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface hover:text-primary">
      <CircleHelp class="size-5" />
      Support
    </button>
  </div>
</aside>
