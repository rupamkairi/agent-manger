<script lang="ts">
  import { RefreshCw, Terminal } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import {
    agents,
    refreshAgentDetection,
    runAgentCommandChecks,
    setSelectedAgent,
    uiState,
  } from "$lib/stores/app-state.svelte";

  let activeTab = $state("Installed");
  const selectedAgent = $derived(agents.find((agent) => agent.id === uiState.selectedAgentId) ?? null);

  function filteredAgents() {
    if (activeTab === "Installed") {
      return agents.filter((agent) => agent.status === "installed");
    }

    if (activeTab === "Missing") {
      return agents.filter((agent) => agent.status !== "installed");
    }

    return agents;
  }

  function rows() {
    return filteredAgents().map((agent) => ({
      _id: agent.id,
      name: `<span class="font-semibold">${agent.name}</span>`,
      state: `<span class="text-code uppercase">${agent.status}</span>`,
      version: agent.version,
      resources: String(agent.resourcePaths.length),
      command: `<span class="text-code uppercase">${agent.commandStatus}</span>`,
    }));
  }

  $effect(() => {
    const visibleAgents = filteredAgents();

    if (visibleAgents.length === 0) {
      if (selectedAgent !== null) {
        setSelectedAgent(null);
      }
      return;
    }

    if (!selectedAgent || !visibleAgents.some((agent) => agent.id === selectedAgent.id)) {
      setSelectedAgent(visibleAgents[0].id);
    }
  });
</script>

<PageHeader title="Agent Detection" description="Detect local coding agents, refresh installed state, and validate command availability.">
  <CommandBar actions={[
    { label: "Refresh Detection", icon: RefreshCw, onClick: () => refreshAgentDetection() },
    { label: "Check Commands", icon: Terminal, variant: "primary", onClick: () => runAgentCommandChecks() },
  ]} />
</PageHeader>

<div class="space-y-5">
  <ResourceTabs tabs={["Installed", "Missing", "All"]} bind:active={activeTab} onChange={(tab) => activeTab = tab} />

  {#if agents.length === 0}
    <EmptyState title="No agent data yet" description="Run detection to populate the local agent inventory." />
  {:else if rows().length === 0}
    <EmptyState title={`No ${activeTab.toLowerCase()} agents`} description="Switch tabs or rerun detection." />
  {:else}
    <DataTable
      columns={[
        { key: "name", label: "Agent", width: "30%" },
        { key: "state", label: "State", width: "14%" },
        { key: "version", label: "Version", width: "28%" },
        { key: "resources", label: "Paths", width: "12%" },
        { key: "command", label: "Command", width: "16%" },
      ]}
      rows={rows()}
      selectedRowId={selectedAgent?.id ?? null}
      onRowClick={(rowId) => setSelectedAgent(rowId)}
    />
  {/if}
</div>
