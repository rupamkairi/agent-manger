<script lang="ts">
  import { Terminal } from "@lucide/svelte";
  import { toggleTerminal, uiState } from "$lib/stores/app-state.svelte";
</script>

<footer class="flex h-7 shrink-0 items-center justify-end border-t border-outline-variant bg-terminal px-4 text-path uppercase">
  <button
    aria-label={uiState.terminalOpen ? "Hide terminal" : "Show terminal"}
    class={`inline-flex items-center gap-1 rounded border px-3 py-0.5 normal-case transition-colors ${
      uiState.terminalOpen
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-outline-variant hover:border-primary/40 hover:text-on-surface"
    }`}
    onclick={toggleTerminal}
  >
    <Terminal class="size-3" />
    Terminal
  </button>
</footer>
