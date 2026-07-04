<script lang="ts">
  import { Bot, FileText, Folder, Timer, TriangleAlert, Zap } from "@lucide/svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import MetricGrid from "$lib/components/metric-grid.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import { getScanSummary, instructions, projects, skills, warnings } from "$lib/stores/app-state.svelte";

  const metrics = [
    { label: "Projects", value: String(projects.length), detail: "active sessions", status: "valid" as const, icon: Folder },
    { label: "Agents", value: String(getScanSummary().detectedAgentsCount), detail: "/ 3 total", status: "valid" as const, icon: Bot },
    { label: "Skills", value: String(skills.length), detail: "+2 new", status: "valid" as const, icon: Zap },
    { label: "Instructions", value: String(instructions.length), detail: "compiled sets", status: "valid" as const, icon: FileText },
    { label: "Warnings", value: String(warnings.length), detail: "urgent", status: "warning" as const, icon: TriangleAlert },
    { label: "Last Scan", value: "2m", detail: "ago", status: "valid" as const, icon: Timer },
  ];

  const resourceRows = [
    {
      id: '<span class="text-primary font-data">#node_77x2</span>',
      type: "VectorStore",
      owner: "Lead_Agent_01",
      status: '<span class="text-success font-data">● READY</span>',
    },
    {
      id: '<span class="text-primary font-data">#node_33k9</span>',
      type: "LogicBranch",
      owner: "Analytic_Bot",
      status: '<span class="text-success font-data">● READY</span>',
    },
    {
      id: '<span class="text-primary font-data">#node_01m4</span>',
      type: "ApiGateway",
      owner: "System_Kernel",
      status: '<span class="text-warning font-data">● SYNC</span>',
    },
  ];
</script>

<PageHeader title="System Overview" description="Monitor and manage your autonomous agent network." />

<div class="space-y-6">
  <MetricGrid {metrics} />
  <ResourceTabs tabs={["Overview", "Recent Resources", "Warnings"]} />
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-label uppercase tracking-wider text-on-surface">Recent Resources</h2>
        <button class="text-sm font-semibold text-primary">View All</button>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Resource_ID" },
          { key: "type", label: "Type" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
        ]}
        rows={resourceRows}
      />
    </section>
    <section class="border border-outline-variant">
      <div class="border-b border-outline-variant px-4 py-3 text-label uppercase tracking-wider text-danger">System Warnings</div>
      <div class="space-y-4 p-4">
        {#each warnings as warning}
          <article class="grid grid-cols-[44px_1fr] gap-3">
            <div class="flex size-11 items-center justify-center rounded bg-danger/20 text-danger">!</div>
            <div>
              <div class="flex justify-between gap-2 font-semibold">
                <span>{warning.resource}</span>
                <span class="text-path text-outline">{warning.time}</span>
              </div>
              <p class="text-sm text-on-surface-variant">{warning.reason}</p>
            </div>
          </article>
        {/each}
      </div>
    </section>
  </div>
</div>
