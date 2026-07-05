<script lang="ts">
  import { Bell, Search, UserCircle } from "@lucide/svelte";
  import { toggleDetails } from "$lib/stores/app-state.svelte";
</script>

<header class="flex h-10 shrink-0 items-center justify-between border-b border-outline-variant bg-background px-4">
  <div class="flex h-full items-center gap-8">
    <div class="text-sm font-semibold text-on-surface">agent-manager</div>
    <nav class="hidden h-full items-center gap-5 md:flex">
      {#each ["File", "Resources", "View", "Help"] as item}
        <button class="h-full border-b-2 border-transparent px-0.5 text-xs text-on-surface-variant hover:border-primary hover:text-on-surface">
          {item}
        </button>
      {/each}
    </nav>
  </div>
  <div class="flex items-center gap-4">
    <label class="hidden h-8 w-60 items-center gap-2 border border-outline-variant bg-surface-low px-2.5 text-on-surface-variant lg:flex">
      <Search class="size-3.5" />
      <input class="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-outline" placeholder="Search commands..." />
    </label>
    <button class="text-on-surface-variant hover:text-on-surface" aria-label="Notifications">
      <Bell class="size-4" />
    </button>
    <button class="text-on-surface-variant hover:text-on-surface" aria-label="Toggle details" onclick={toggleDetails}>
      <UserCircle class="size-5" />
    </button>
  </div>
</header>
