<script lang="ts">
  import { getCurrentPage } from "$lib/stores/current-page.svelte";

  const titles = {
    projects: "Projects",
    agents: "Agents",
    skills: "Skills",
    instructions: "Instructions",
    settings: "Settings",
  };
</script>

<header class="flex h-12 items-center border-b px-4">
  <h1 class="text-sm font-medium">{titles[getCurrentPage()]}</h1>
</header>
