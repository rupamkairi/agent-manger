<script lang="ts">
  import { Terminal, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { FitAddon } from "xterm-addon-fit";
  import { Terminal as XTerm } from "xterm";
  import "xterm/css/xterm.css";
  import { desktopApi } from "$lib/services/desktop-api";
  import { toggleTerminal } from "$lib/stores/app-state.svelte";

  const terminalTheme = {
    background: "#000000",
    foreground: "#e1e2ec",
    cursor: "#4edea3",
    selectionBackground: "#32353c",
    black: "#0b0e15",
    red: "#ffb4ab",
    green: "#4edea3",
    yellow: "#ffb786",
    blue: "#adc6ff",
    magenta: "#d8b4fe",
    cyan: "#6ffbbe",
    white: "#e1e2ec",
    brightBlack: "#424754",
    brightRed: "#ffdad6",
    brightGreen: "#6ffbbe",
    brightYellow: "#ffdcc6",
    brightBlue: "#d8e2ff",
    brightMagenta: "#e9d5ff",
    brightCyan: "#a7f3d0",
    brightWhite: "#ffffff",
  };

  let terminalEl: HTMLDivElement | null = null;
  let terminal: XTerm | null = null;
  let fitAddon: FitAddon | null = null;
  let observer: ResizeObserver | null = null;
  let pollHandle: number | null = null;
  let pollCursor = 0;
  let syncing = false;

  async function bootstrapTerminal() {
    if (!terminalEl || terminal) {
      return;
    }

    terminal = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      scrollback: 5000,
      theme: terminalTheme,
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalEl);
    terminal.onData((data) => void desktopApi.terminalWrite(data));

    observer = new ResizeObserver(() => {
      if (!terminalEl?.clientHeight) {
        return;
      }

      fitAddon?.fit();
      terminal?.focus();
    });
    observer.observe(terminalEl);

    await desktopApi.terminalEnsureStarted();
    await syncTerminal();

    if (pollHandle === null) {
      pollHandle = window.setInterval(() => {
        void syncTerminal();
      }, 75);
    }
  }

  async function syncTerminal() {
    if (syncing) {
      return;
    }

    syncing = true;

    try {
      await desktopApi.terminalEnsureStarted();
      const chunks = await desktopApi.terminalRead(pollCursor);

      for (const chunk of chunks) {
        pollCursor = Math.max(pollCursor, chunk.seq);
        terminal?.write(chunk.data);
      }

      if (chunks.length > 0 && terminalEl?.clientHeight) {
        fitAddon?.fit();
        terminal?.focus();
      }
    } finally {
      syncing = false;
    }
  }

  function focusTerminal() {
    terminal?.focus();
  }

  function handleTerminalKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    focusTerminal();
  }

  function closeTerminal() {
    toggleTerminal();
  }

  onMount(() => {
    void bootstrapTerminal();

    return () => {
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
        pollHandle = null;
      }

      observer?.disconnect();
      observer = null;

      terminal?.dispose();
      terminal = null;
      fitAddon = null;
    };
  });
</script>

<section class="h-64 shrink-0 overflow-hidden border-t border-outline-variant bg-terminal">
  <div class="flex h-8 items-center justify-between border-b border-outline-variant bg-surface-container px-3">
    <div class="flex items-center gap-2 text-path text-on-surface-variant">
      <Terminal class="size-3.5" />
      Terminal
      <span class="text-success">bash</span>
    </div>
    <button aria-label="Close terminal" type="button" onclick={closeTerminal}>
      <X class="size-3.5" />
    </button>
  </div>

  <div
    bind:this={terminalEl}
    class="h-[calc(100%-2rem)] w-full"
    role="button"
    tabindex="0"
    aria-label="Focus terminal"
    onclick={focusTerminal}
    onkeydown={handleTerminalKeydown}
  ></div>
</section>
