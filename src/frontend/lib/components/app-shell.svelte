<script lang="ts">
  import AppSidebar from "./app-sidebar.svelte";
  import AppTopbar from "./app-topbar.svelte";
  import Projects from "$lib/routes/projects.svelte";
  import Agents from "$lib/routes/agents.svelte";
  import Skills from "$lib/routes/skills.svelte";
  import Instructions from "$lib/routes/instructions.svelte";
  import Settings from "$lib/routes/settings.svelte";
  import { getCurrentPage } from "$lib/stores/current-page.svelte";

  const pages = {
    projects: Projects,
    agents: Agents,
    skills: Skills,
    instructions: Instructions,
    settings: Settings,
  };
</script>

<div class="flex h-screen">
  <AppSidebar />
  <div class="flex flex-1 flex-col overflow-hidden">
    <AppTopbar />
    <main class="flex-1 overflow-auto p-6">
      {@render pages[getCurrentPage()]()}
    </main>
  </div>
</div>
