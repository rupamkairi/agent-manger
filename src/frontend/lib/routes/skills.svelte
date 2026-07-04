<script lang="ts">
  import { CheckCircle2, Upload } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { skills } from "$lib/stores/app-state.svelte";

  const rows = skills.map((skill) => ({
    name: `<span class="font-semibold">${skill.name}</span>`,
    description: skill.description,
    scope: `<span class="rounded border border-outline-variant bg-surface-highest px-2 py-1 text-path uppercase">${skill.scope}</span>`,
    target: skill.agentTarget,
    location: `<span class="text-code text-on-surface-variant">${skill.location}</span>`,
    status: `<span class="text-code uppercase">${skill.status}</span>`,
  }));
</script>

<PageHeader title="Skills Registry" description="Deploy and manage atomic capabilities for your agent fleet. Validate logic chains and scope execution parameters.">
  <CommandBar actions={[
    { label: "Import Skill", icon: Upload },
    { label: "Validate", icon: CheckCircle2, variant: "primary" },
  ]} />
</PageHeader>

<div class="space-y-6">
  <ResourceTabs tabs={["All Skills", "Global", "Project", "Invalid", "Duplicates"]} />
  <DataTable
    columns={[
      { key: "name", label: "Skill Name", width: "20%" },
      { key: "description", label: "Description" },
      { key: "scope", label: "Scope", width: "10%" },
      { key: "target", label: "Agent Target", width: "16%" },
      { key: "location", label: "Location", width: "18%" },
      { key: "status", label: "Validation Status", width: "14%" },
    ]}
    {rows}
  />
</div>
