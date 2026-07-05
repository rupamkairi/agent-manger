<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import {
    instructions,
    refreshProjects,
    setSelectedInstruction,
    uiState,
  } from "$lib/stores/app-state.svelte";

  let activeTab = $state("All");
  const selectedInstruction = $derived(instructions.find((instruction) => instruction.id === uiState.selectedInstructionId) ?? null);

  function filteredInstructions() {
    if (activeTab === "Valid") {
      return instructions.filter((instruction) => instruction.status === "valid");
    }

    if (activeTab === "Needs Fix") {
      return instructions.filter((instruction) => instruction.status !== "valid");
    }

    return instructions;
  }

  function rows() {
    return filteredInstructions().map((instruction) => ({
      _id: instruction.id,
      name: `<span class="font-semibold">${instruction.name}</span>`,
      scope: `<span class="text-code uppercase">${instruction.scope}</span>`,
      target: `<span class="text-code uppercase">${instruction.agentTarget}</span>`,
      modified: `<span class="text-code">${instruction.lastModified}</span>`,
      status: `<span class="text-code uppercase">${instruction.status}</span>`,
      path: `<span class="break-all text-code">${instruction.path}</span>`,
    }));
  }
</script>

<PageHeader title="Instructions" description="Detected AGENTS / CLAUDE / OpenCode instruction files." >
  <CommandBar actions={[{ label: "Rescan Projects", icon: RefreshCw, onClick: () => refreshProjects() }]} />
</PageHeader>

<div class="space-y-5">
  <ResourceTabs tabs={["All", "Valid", "Needs Fix"]} bind:active={activeTab} onChange={(tab) => activeTab = tab} />

  {#if instructions.length === 0}
    <EmptyState title="No instructions detected" description="Add instruction files to a project and rescan to populate the inventory." />
  {:else if rows().length === 0}
    <EmptyState title={`No ${activeTab.toLowerCase()} instructions`} description="Switch tabs or rescan projects." />
  {:else}
    <DataTable
      columns={[
        { key: "name", label: "Instruction", width: "18%" },
        { key: "scope", label: "Scope", width: "12%" },
        { key: "target", label: "Target", width: "12%" },
        { key: "modified", label: "Modified", width: "16%" },
        { key: "status", label: "Status", width: "10%" },
        { key: "path", label: "Path" },
      ]}
      rows={rows()}
      selectedRowId={selectedInstruction?.id ?? null}
      onRowClick={(rowId) => setSelectedInstruction(rowId)}
    />
  {/if}
</div>
