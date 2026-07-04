<script lang="ts">
  import { getScanSummary, getSelectedProject } from "$lib/stores/app-state.svelte";
</script>

<footer class="flex h-7 shrink-0 items-center justify-between border-t border-outline-variant bg-terminal px-5 text-path uppercase">
  <div class="text-success">
    Project: {getSelectedProject().name} | Scan: {getScanSummary().status}
  </div>
  <div class="flex items-center gap-8 text-on-surface">
    <span>Agents: {getScanSummary().detectedAgentsCount}</span>
    <span class="text-warning">Warnings: {getScanSummary().warningCount}</span>
    <span class="text-success">System_Online_100%</span>
  </div>
</footer>
