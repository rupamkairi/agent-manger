<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { getSkills, getSelectedSkill, refreshProjects, setSelectedSkill } from "$lib/stores/app-state.svelte";

  let activeTab = $state("All");

  function filteredSkills() {
    if (activeTab === "Valid") {
      return getSkills().filter((skill) => skill.status === "valid");
    }

    if (activeTab === "Needs Fix") {
      return getSkills().filter((skill) => skill.status !== "valid");
    }

    return getSkills();
  }

  function rows() {
    return filteredSkills().map((skill) => ({
      _id: skill.id,
      name: `<span class="font-semibold">${skill.name}</span>`,
      description: `<span class="text-on-surface-variant">${skill.description}</span>`,
      scope: `<span class="text-code uppercase">${skill.scope}</span>`,
      agentTarget: `<span class="text-code uppercase">${skill.agentTarget}</span>`,
      location: `<span class="break-all text-code">${skill.location}</span>`,
      status: `<span class="text-code uppercase">${skill.status}</span>`,
    }));
  }
</script>

<PageHeader title="Skills" description="Scanned skill folders, manifest validation, and target scope." >
  <CommandBar actions={[{ label: "Rescan Projects", icon: RefreshCw, onClick: () => refreshProjects() }]} />
</PageHeader>

<div class="space-y-5">
  <ResourceTabs tabs={["All", "Valid", "Needs Fix"]} bind:active={activeTab} onChange={(tab) => activeTab = tab} />

  {#if getSkills().length === 0}
    <EmptyState title="No skills detected" description="Add a project with skill folders and rescan to populate the inventory." />
  {:else if rows().length === 0}
    <EmptyState title={`No ${activeTab.toLowerCase()} skills`} description="Switch tabs or rescan projects." />
  {:else}
    <DataTable
      columns={[
        { key: "name", label: "Skill", width: "18%" },
        { key: "description", label: "Description", width: "32%" },
        { key: "scope", label: "Scope", width: "12%" },
        { key: "agentTarget", label: "Target", width: "12%" },
        { key: "location", label: "Location", width: "18%" },
        { key: "status", label: "Status", width: "8%" },
      ]}
      rows={rows()}
      selectedRowId={getSelectedSkill()?.id ?? null}
      onRowClick={(rowId) => setSelectedSkill(rowId)}
    />
  {/if}
</div>
