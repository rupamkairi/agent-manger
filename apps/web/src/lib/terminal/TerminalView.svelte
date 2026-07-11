<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Terminal } from "@xterm/xterm";
	import { FitAddon } from "@xterm/addon-fit";
	import "@xterm/xterm/css/xterm.css";
	import { TerminalSocket, type TerminalSocketStatus } from "./ws-client";

	let {
		sessionId,
		onExit,
	}: {
		sessionId: string;
		onExit?: (code: number | null) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let status = $state<TerminalSocketStatus>("connecting");
	let exited = $state(false);

	let term: Terminal | undefined;
	let fitAddon: FitAddon | undefined;
	let socket: TerminalSocket | undefined;
	let observer: ResizeObserver | undefined;
	let resizeDebounce: ReturnType<typeof setTimeout> | undefined;

	const statusLabel = $derived(
		{
			connecting: "Connecting…",
			open: "Connected",
			reconnecting: "Reconnecting…",
			closed: "Disconnected",
		}[status],
	);

	function scheduleResizeSend() {
		if (resizeDebounce) clearTimeout(resizeDebounce);
		resizeDebounce = setTimeout(() => {
			if (term) socket?.sendResize(term.cols, term.rows);
		}, 100);
	}

	onMount(() => {
		if (!container) return;

		term = new Terminal({
			cursorBlink: true,
			fontFamily:
				'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
			fontSize: 13,
		});
		fitAddon = new FitAddon();
		term.loadAddon(fitAddon);
		term.open(container);
		fitAddon.fit();

		socket = new TerminalSocket(sessionId, {
			onOutput(data) {
				term?.write(data);
			},
			onReady() {
				term?.clear();
			},
			onExit(code) {
				exited = true;
				term?.write(`\r\n\x1b[2m[process exited]\x1b[0m\r\n`);
				onExit?.(code);
			},
			onStatus(next) {
				status = next;
			},
		});
		socket.connect();

		term.onData((data) => {
			socket?.sendInput(data);
		});

		observer = new ResizeObserver(() => {
			fitAddon?.fit();
			scheduleResizeSend();
		});
		observer.observe(container);
	});

	onDestroy(() => {
		if (resizeDebounce) clearTimeout(resizeDebounce);
		observer?.disconnect();
		socket?.close();
		term?.dispose();
	});
</script>

<div class="flex h-full min-h-0 flex-col gap-2">
	<div class="text-muted-foreground flex items-center gap-1.5 text-xs">
		<span
			class={[
				"size-1.5 rounded-full",
				status === "open" ? "bg-emerald-500" : status === "closed" ? "bg-destructive" : "bg-amber-500",
			]}
		></span>
		{statusLabel}
		{#if exited}
			<span>· process exited</span>
		{/if}
	</div>
	<div class="min-h-0 flex-1 overflow-hidden rounded-md border bg-[#000] p-2">
		<div bind:this={container} class="h-full w-full"></div>
	</div>
</div>
