<script lang="ts">
  import { Plus, RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { projects, setSelectedProject } from "$lib/stores/app-state.svelte";

  const rows = projects.map((project) => ({
    name: `<span class="font-semibold text-on-surface">${project.name}</span>`,
    path: `<span class="text-code text-on-surface-variant">${project.path}</span>`,
    scanned: project.lastScanned,
    summary: `<span class="mr-2 rounded border border-success/40 bg-success/10 px-2 py-1 text-path text-success">${project.agentCount} agents</span><span class="rounded border border-warning/40 bg-warning/10 px-2 py-1 text-path text-warning">${project.skillCount} skills</span>`,
  }));
</script>

<PageHeader title="Managed Projects" description="Inventory of localized agent clusters and resource mappings.">
  <CommandBar actions={[
    { label: "Refresh", icon: RefreshCw },
    { label: "Add Project", icon: Plus, variant: "primary" },
  ]} />
</PageHeader>

<div class="space-y-6">
  <ResourceTabs tabs={["Overview", "Resources", "Settings"]} />
  <div onclick={() => setSelectedProject(projects[0].id)}>
    <DataTable
      columns={[
        { key: "name", label: "Project Name", width: "24%" },
        { key: "path", label: "Path" },
        { key: "scanned", label: "Last Scanned", width: "16%" },
        { key: "summary", label: "Resource Summary", width: "26%" },
      ]}
      {rows}
    />
  </div>
</div>
