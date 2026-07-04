<script lang="ts">
  import {
    FolderOpen,
    Bot,
    Sparkles,
    FileText,
    Settings,
  } from "@lucide/svelte";
  import { cn } from "$lib/utils.js";
  import { getCurrentPage, setCurrentPage } from "$lib/stores/current-page.svelte";

  const navItems = [
    { id: "projects" as const, label: "Projects", icon: FolderOpen },
    { id: "agents" as const, label: "Agents", icon: Bot },
    { id: "skills" as const, label: "Skills", icon: Sparkles },
    { id: "instructions" as const, label: "Instructions", icon: FileText },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];
</script>

<aside class="flex w-64 flex-col border-r bg-muted/30">
  <div class="flex h-12 items-center border-b px-4">
    <span class="font-semibold">AI Resource Manager</span>
  </div>
  <nav class="flex-1 space-y-1 p-2">
    {#each navItems as item}
      <button
        class={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          getCurrentPage() === item.id && "bg-accent text-accent-foreground"
        )}
        onclick={() => setCurrentPage(item.id)}
      >
        <item.icon class="size-4" />
        {item.label}
      </button>
    {/each}
  </nav>
</aside>
