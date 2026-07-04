<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { warnings } from "$lib/stores/app-state.svelte";

  const rows = warnings.map((warning) => ({
    severity: `<span class="text-code uppercase">${warning.severity}</span>`,
    resource: warning.resource,
    reason: warning.reason,
    fix: warning.suggestedFix,
    time: warning.time,
  }));
</script>

<PageHeader title="Health" description="Resource problems, validation failures, and suggested fixes.">
  <CommandBar actions={[{ label: "Refresh Scan", icon: RefreshCw, variant: "primary" }]} />
</PageHeader>

<div class="space-y-6">
  <ResourceTabs tabs={["All", "Skills", "Instructions", "Memory", "Agents"]} />
  <DataTable
    columns={[
      { key: "severity", label: "Severity", width: "12%" },
      { key: "resource", label: "Resource", width: "18%" },
      { key: "reason", label: "Reason" },
      { key: "fix", label: "Suggested Fix" },
      { key: "time", label: "Time", width: "12%" },
    ]}
    {rows}
  />
</div>
