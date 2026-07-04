<script lang="ts">
  import { Terminal, Trash2, X } from "@lucide/svelte";
  import { tick } from "svelte";
  import { desktopApi } from "$lib/services/desktop-api";
  import { appendTerminalLines, clearTerminalLines, getSelectedProject, getTerminalHeight, terminalLines, toggleTerminal } from "$lib/stores/app-state.svelte";

  const levelClass: Record<string, string> = {
    INFO: "text-success",
    WARN: "text-warning",
    ERR: "text-danger",
    EXEC: "text-primary",
    OK: "text-success",
  };

  let command = $state("");
  let running = $state(false);
  let outputEl: HTMLDivElement | null = null;

  function splitLines(message: string, level: keyof typeof levelClass) {
    return message
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({
        id: crypto.randomUUID(),
        level,
        time: "local",
        message: line,
      }));
  }

  async function runCommand(event: SubmitEvent) {
    event.preventDefault();

    const nextCommand = command.trim();

    if (!nextCommand || running) {
      return;
    }

    running = true;
    const cwd = getSelectedProject()?.path ?? undefined;

    appendTerminalLines([
      {
        id: crypto.randomUUID(),
        level: "EXEC",
        time: "local",
        message: `${cwd ?? "~"} $ ${nextCommand}`,
      },
    ]);

    try {
      const result = await desktopApi.runShellCommand(nextCommand, cwd);
      const outputLines = [
        ...splitLines(result.stdout, "INFO"),
        ...splitLines(result.stderr, "ERR"),
        {
          id: crypto.randomUUID(),
          level: result.exitCode === 0 ? "OK" : "ERR",
          time: "local",
          message: `exit ${result.exitCode} via ${result.shell}`,
        },
      ];

      appendTerminalLines(outputLines);
    } catch (error) {
      appendTerminalLines([
        {
          id: crypto.randomUUID(),
          level: "ERR",
          time: "local",
          message: error instanceof Error ? error.message : "Terminal command failed.",
        },
      ]);
    } finally {
      command = "";
      running = false;
      await tick();
      outputEl?.scrollTo({ top: outputEl.scrollHeight });
    }
  }
</script>

<section class="flex shrink-0 flex-col border-t border-outline-variant bg-terminal" style:height={`${getTerminalHeight()}px`}>
  <div class="flex h-8 items-center justify-between border-b border-outline-variant bg-surface-container px-3">
    <div class="flex items-center gap-2 text-path text-on-surface-variant">
      <Terminal class="size-3.5" />
      Integrated Terminal
      <span class="text-success">bash</span>
      <span class="text-outline">{getSelectedProject()?.path ?? "~"}</span>
    </div>
    <div class="flex items-center gap-2 text-on-surface-variant">
      <button class="inline-flex items-center gap-1 text-path uppercase hover:text-on-surface" type="button" onclick={clearTerminalLines}>
        <Trash2 class="size-3.5" />
        Clear
      </button>
      <button aria-label="Close terminal" type="button" onclick={toggleTerminal}>
        <X class="size-3.5" />
      </button>
    </div>
  </div>

  <div bind:this={outputEl} class="flex-1 overflow-auto px-4 py-3 text-code">
    {#each terminalLines as line}
      <div class="whitespace-pre-wrap leading-5">
        <span class={levelClass[line.level]}>{line.level}</span>
        <span class="mx-2 text-outline">[{line.time}]</span>
        <span class="text-on-surface-variant">{line.message}</span>
      </div>
    {/each}
    <div class="mt-2 text-on-surface">
      <span class="text-on-surface-variant">bash&gt;</span> {command || " "}
      {#if running}
        <span class="ml-2 inline-block h-3.5 w-1.5 bg-primary align-middle"></span>
      {/if}
    </div>
  </div>

  <form class="border-t border-outline-variant bg-background/30 px-3 py-2" onsubmit={runCommand}>
    <label class="sr-only" for="terminal-command">Terminal command</label>
    <div class="flex items-center gap-2">
      <span class="text-path text-on-surface-variant">bash&gt;</span>
      <input
        id="terminal-command"
        class="h-8 min-w-0 flex-1 border border-outline-variant bg-transparent px-2 text-sm outline-none"
        bind:value={command}
        placeholder="pwd"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        class="h-8 rounded border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        type="submit"
        disabled={running || !command.trim()}
      >
        Run
      </button>
    </div>
  </form>
</section>
