<script lang="ts">
  import { Bell, Search, UserCircle } from "@lucide/svelte";
  import { toggleDetails } from "$lib/stores/app-state.svelte";
</script>

<header class="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant bg-background px-5">
  <div class="flex h-full items-center gap-10">
    <div class="text-xl font-semibold text-on-surface">Agent Manager</div>
    <nav class="hidden h-full items-center gap-7 md:flex">
      {#each ["File", "Resources", "View", "Help"] as item}
        <button class="h-full border-b-2 border-transparent px-1 text-sm text-on-surface hover:border-primary hover:text-primary">
          {item}
        </button>
      {/each}
    </nav>
  </div>
  <div class="flex items-center gap-5">
    <label class="hidden h-10 w-72 items-center gap-3 border border-outline-variant bg-surface-low px-3 text-on-surface-variant lg:flex">
      <Search class="size-4" />
      <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-outline" placeholder="Search commands..." />
    </label>
    <button class="text-on-surface-variant hover:text-primary" aria-label="Notifications">
      <Bell class="size-5" />
    </button>
    <button class="text-on-surface-variant hover:text-primary" aria-label="Toggle details" onclick={toggleDetails}>
      <UserCircle class="size-6" />
    </button>
  </div>
</header>
