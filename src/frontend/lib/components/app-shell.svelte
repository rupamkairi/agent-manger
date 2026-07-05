<script lang="ts">
  import AppSidebar from "./app-sidebar.svelte";
  import DetailsPanel from "./details-panel.svelte";
  import StatusBar from "./status-bar.svelte";
  import TerminalDrawer from "./terminal-drawer.svelte";
  import Dashboard from "$lib/routes/dashboard.svelte";
  import Projects from "$lib/routes/projects.svelte";
  import Agents from "$lib/routes/agents.svelte";
  import Skills from "$lib/routes/skills.svelte";
  import Instructions from "$lib/routes/instructions.svelte";
  import Memory from "$lib/routes/memory.svelte";
  import Health from "$lib/routes/health.svelte";
  import Settings from "$lib/routes/settings.svelte";
  import { uiState } from "$lib/stores/app-state.svelte";

  const pages = {
    dashboard: Dashboard,
    projects: Projects,
    agents: Agents,
    skills: Skills,
    instructions: Instructions,
    memory: Memory,
    health: Health,
    settings: Settings,
  };
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background text-on-surface">
  <div class="flex min-h-0 flex-1">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1">
        <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-auto p-5">
            {#key uiState.currentPage}
              {@const Page = pages[uiState.currentPage]}
              <Page />
            {/key}
          </div>
        </main>
        {#if uiState.detailsOpen}
          <DetailsPanel />
        {/if}
      </div>
      {#if uiState.terminalOpen}
        <TerminalDrawer />
      {/if}
    </div>
  </div>
  <StatusBar />
</div>
