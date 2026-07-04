<script lang="ts">
  import { Terminal } from "@lucide/svelte";
  import { getTerminalOpen, getScanSummary, getSelectedProject, toggleTerminal } from "$lib/stores/app-state.svelte";
</script>

<footer class="flex h-6 shrink-0 items-center justify-between border-t border-outline-variant bg-terminal px-4 text-path uppercase">
  <div class="text-success">
    Project: {getSelectedProject()?.name ?? "none"} | Scan: {getScanSummary().status}
  </div>
  <div class="flex items-center gap-6 text-on-surface-variant">
    <button
      aria-label={getTerminalOpen() ? "Hide terminal" : "Show terminal"}
      class={`inline-flex items-center gap-1 rounded border px-2 py-0.5 normal-case transition-colors ${
        getTerminalOpen()
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-outline-variant hover:border-primary/40 hover:text-on-surface"
      }`}
      onclick={toggleTerminal}
    >
      <Terminal class="size-3" />
      bash
    </button>
    <span>Agents: {getScanSummary().detectedAgentsCount}</span>
    <span class="text-warning">Warnings: {getScanSummary().warningCount}</span>
    <span class="text-success">Sys: Online</span>
  </div>
</footer>
