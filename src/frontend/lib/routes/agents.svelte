<script lang="ts">
  import { RefreshCw, Terminal } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { agents } from "$lib/stores/app-state.svelte";

  const rows = agents.map((agent) => ({
    name: `<span class="font-semibold">${agent.name}</span>`,
    state: `<span class="text-code uppercase">${agent.status}</span>`,
    version: agent.version,
    binary: `<span class="text-code text-on-surface-variant">${agent.binaryPath}</span>`,
    paths: agent.resourcePaths.join("<br />"),
    command: `<span class="text-code uppercase">${agent.commandStatus}</span>`,
  }));
</script>

<PageHeader title="Agent Detection" description="Detected local coding agents and verified resource paths.">
  <CommandBar actions={[
    { label: "Refresh Detection", icon: RefreshCw },
    { label: "Check Commands", icon: Terminal, variant: "primary" },
  ]} />
</PageHeader>

<div class="space-y-6">
  <ResourceTabs tabs={["Installed", "Missing", "Resource Paths", "Command Check"]} />
  <DataTable
    columns={[
      { key: "name", label: "Agent" },
      { key: "state", label: "State", width: "12%" },
      { key: "version", label: "Version", width: "12%" },
      { key: "binary", label: "Binary Path" },
      { key: "paths", label: "Known Paths" },
      { key: "command", label: "Command" },
    ]}
    {rows}
  />
</div>
