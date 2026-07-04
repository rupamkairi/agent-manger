<script lang="ts">
  import { ChevronDown, Search, Terminal, X } from "@lucide/svelte";
  import { terminalLines, toggleTerminal } from "$lib/stores/app-state.svelte";

  const levelClass: Record<string, string> = {
    INFO: "text-success",
    WARN: "text-warning",
    ERR: "text-danger",
    EXEC: "text-primary",
    OK: "text-success",
  };
</script>

<section class="flex min-h-[120px] flex-col border-t border-outline-variant bg-terminal">
  <div class="flex h-9 items-center justify-between border-b border-outline-variant bg-surface-container px-4">
    <div class="flex items-center gap-3 text-path uppercase text-on-surface">
      <Terminal class="size-4" />
      System Console
      <span class="text-success">INFO: 24 active</span>
      <span class="text-warning">WARN: 1 legacy</span>
    </div>
    <div class="flex items-center gap-3 text-on-surface-variant">
      <Search class="size-4" />
      <ChevronDown class="size-4" />
      <button aria-label="Close terminal" onclick={toggleTerminal}>
        <X class="size-4" />
      </button>
    </div>
  </div>
  <div class="flex-1 overflow-auto px-5 py-4 text-code">
    {#each terminalLines as line}
      <div class="whitespace-pre-wrap">
        <span class={levelClass[line.level]}>{line.level}</span>
        <span class="mx-3 text-outline">[{line.time}]</span>
        <span class="text-on-surface-variant">{line.message}</span>
      </div>
    {/each}
    <div class="mt-2 text-on-surface">
      <span class="text-on-surface-variant">root@agent-manager:~$</span> validate --all --deep
      <span class="ml-2 inline-block h-4 w-2 bg-primary align-middle"></span>
    </div>
  </div>
</section>
