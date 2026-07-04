<script lang="ts">
  import { FilePlus, FolderOpen, Trash2 } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { memoryFiles } from "$lib/stores/app-state.svelte";

  const rows = memoryFiles.map((file) => ({
    name: `<span class="font-semibold">${file.name}</span>`,
    target: file.agentTarget,
    scope: file.scope,
    location: `<span class="text-code text-on-surface-variant">${file.path}</span>`,
    size: file.size,
    modified: file.lastModified,
    status: file.status,
  }));
</script>

<PageHeader title="Memory" description="Manage local memory files across global and project scopes.">
  <CommandBar actions={[
    { label: "Create Memory", icon: FilePlus, variant: "primary" },
    { label: "Open Location", icon: FolderOpen },
    { label: "Delete", icon: Trash2, variant: "danger" },
  ]} />
</PageHeader>

<div class="space-y-6">
  <ResourceTabs tabs={["All", "Global", "Project", "Agent-specific", "Warnings"]} />
  <DataTable
    columns={[
      { key: "name", label: "Memory File" },
      { key: "target", label: "Agent Target" },
      { key: "scope", label: "Scope" },
      { key: "location", label: "Location" },
      { key: "size", label: "Size" },
      { key: "modified", label: "Last Modified" },
      { key: "status", label: "Status" },
    ]}
    {rows}
  />
</div>
