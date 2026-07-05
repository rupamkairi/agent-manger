<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import {
    refreshProjects,
    setSelectedSkill,
    skills,
    uiState,
    warnings,
  } from "$lib/stores/app-state.svelte";
  import { describeSkillsEmptyState, filterSkillsForTab, resolveSelectedSkillId, type SkillsTabId } from "$lib/stores/app-state-helpers";

  const tabs = ["All", "Global", "Project", "Shared 🚧", "Invalid 🚧", "Duplicates 🚧"];
  let activeTab = $state<SkillsTabId>("All");

  const filteredSkills = $derived(filterSkillsForTab(skills, activeTab, uiState.selectedProjectId));
  const selectedSkill = $derived(filteredSkills.find((skill) => skill.id === uiState.selectedSkillId) ?? null);
  const emptyState = $derived(describeSkillsEmptyState(skills, filteredSkills, activeTab, warnings));

  function rows() {
    return filteredSkills.map((skill) => ({
      _id: skill.id,
      name: `<span class="font-semibold">${skill.name}</span>`,
      description: `<span class="text-on-surface-variant">${skill.description}</span>`,
      scope: `<span class="text-code uppercase">${skill.scope}</span>`,
      agentTarget: `<span class="text-code uppercase">${skill.agentTarget}</span>`,
      location: `<span class="break-all text-code">${skill.location}</span>`,
      duplicate: skill.duplicateName
        ? `<span class="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-path text-warning">DUP</span>`
        : `<span class="text-on-surface-variant">-</span>`,
      status: `<span class="text-code uppercase">${skill.status}</span>`,
    }));
  }

  $effect(() => {
    const nextSelectedSkillId = resolveSelectedSkillId(filteredSkills, uiState.selectedSkillId);

    if (nextSelectedSkillId !== uiState.selectedSkillId) {
      setSelectedSkill(nextSelectedSkillId);
    }
  });
</script>

<PageHeader title="Skills" description="Global, project, and shared skill folders from verified roots.">
  <CommandBar actions={[{ label: "Rescan Projects", icon: RefreshCw, onClick: () => refreshProjects() }]} />
</PageHeader>

<div class="space-y-5">
  <ResourceTabs
    tabs={tabs}
    active={activeTab}
    disabledTabs={["Shared 🚧", "Invalid 🚧", "Duplicates 🚧"]}
    onChange={(tab) => activeTab = tab as SkillsTabId}
  />

  {#if skills.length === 0 || rows().length === 0}
    <EmptyState title={emptyState.title} description={emptyState.description} />
  {:else}
    <DataTable
      columns={[
        { key: "name", label: "Skill", width: "18%" },
        { key: "description", label: "Description", width: "30%" },
        { key: "scope", label: "Scope", width: "12%" },
        { key: "agentTarget", label: "Target", width: "12%" },
        { key: "location", label: "Location", width: "14%" },
        { key: "duplicate", label: "Dup", width: "6%" },
        { key: "status", label: "Status", width: "8%" },
      ]}
      rows={rows()}
      selectedRowId={selectedSkill?.id ?? null}
      onRowClick={(rowId) => setSelectedSkill(rowId)}
    />
  {/if}
</div>
