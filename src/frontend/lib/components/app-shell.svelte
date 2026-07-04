<script lang="ts">
  import AppSidebar from "./app-sidebar.svelte";
  import AppTopbar from "./app-topbar.svelte";
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
  import TerminalPage from "$lib/routes/terminal.svelte";
  import Settings from "$lib/routes/settings.svelte";
  import { getCurrentPage, getDetailsOpen, getTerminalOpen } from "$lib/stores/app-state.svelte";

  const pages = {
    dashboard: Dashboard,
    projects: Projects,
    agents: Agents,
    skills: Skills,
    instructions: Instructions,
    memory: Memory,
    health: Health,
    terminal: TerminalPage,
    settings: Settings,
  };
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background text-on-surface">
  <AppTopbar />
  <div class="flex min-h-0 flex-1">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1">
        <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-auto p-6">
            {#key getCurrentPage()}
              {@const Page = pages[getCurrentPage()]}
              <Page />
            {/key}
          </div>
          {#if getTerminalOpen()}
            <TerminalDrawer />
          {/if}
        </main>
        {#if getDetailsOpen()}
          <DetailsPanel />
        {/if}
      </div>
    </div>
  </div>
  <StatusBar />
</div>
