<script lang="ts">
	import { tick } from "svelte";
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import JobStateBadge from "$lib/components/workflows/JobStateBadge.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
	import { cancelJob, getJob } from "$lib/api/endpoints";
	import { downloadJobLogs, subscribeToJobEvents, subscribeToJobLogs } from "$lib/api/events";
	import { ApiError } from "$lib/api/client";
	import { createQuery } from "$lib/state/query.svelte";
	import { formatDateTime, formatDuration, isActiveState } from "$lib/workflows/format";
	import { toast } from "svelte-sonner";
	import DownloadIcon from "@lucide/svelte/icons/download";
	import CircleStopIcon from "@lucide/svelte/icons/circle-stop";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";

	let { params }: { params: Record<string, string> } = $props();
	const jobId = $derived(params.jobId ?? "");
	const jobQuery = createQuery(() => getJob(jobId));
	let stdout = $state("");
	let stderr = $state("");
	let streamConnected = $state(false);
	let follow = $state(true);
	let cancelling = $state(false);
	let downloading = $state(false);
	let logsEl = $state<HTMLDivElement>();
	let logOffsets = new Map<string, number>();
	const textEncoder = new TextEncoder();
	const textDecoder = new TextDecoder();

	// Whether we've learned this job's log availability yet, and what it is.
	// Kept separate from the reset effect below so resolving it (once, per
	// job) doesn't itself retrigger the connect effect's reset logic.
	let logsResolved = $state(false);
	let logsAvailable = $state(true);

	async function scrollToEnd() {
		if (!follow) return;
		await tick();
		logsEl?.scrollTo({ top: logsEl.scrollHeight, behavior: "smooth" });
	}

	// Reset per-job state whenever the job id changes.
	$effect(() => {
		if (!jobId) return;
		stdout = ""; stderr = ""; logOffsets = new Map();
		logsResolved = false;
		logsAvailable = true;
	});

	// Resolve log availability once the job detail has loaded.
	$effect(() => {
		const detail = jobQuery.data;
		if (!jobId || !detail || logsResolved) return;
		logsAvailable = detail.logAvailable !== false;
		logsResolved = true;
	});

	// Only wire the SSE streams once we know logs are available on this host.
	$effect(() => {
		if (!jobId || !logsResolved) return;
		if (!logsAvailable) { streamConnected = false; return; }
		streamConnected = true;
		const closeEvents = subscribeToJobEvents(jobId, () => void jobQuery.refresh());
		const closeLogs = subscribeToJobLogs(jobId, (event) => {
			streamConnected = true;
			const rawChunk = typeof event.chunk === "string" ? event.chunk : "";
			const key = `${event.jobId}:${event.stream}`;
			const seen = logOffsets.get(key) ?? 0;
			const offset = Number.isFinite(event.offset) ? event.offset : seen;
			const encoded = textEncoder.encode(rawChunk);
			const end = offset + encoded.byteLength;
			if (end <= seen) return;
			const overlap = Math.max(0, seen - offset);
			const chunk = overlap > 0 ? textDecoder.decode(encoded.slice(overlap)) : rawChunk;
			logOffsets.set(key, end);
			if (event.stream === "stderr") stderr = `${stderr}${chunk}`.slice(-1_000_000);
			else stdout = `${stdout}${chunk}`.slice(-1_000_000);
			void scrollToEnd();
		}, () => { streamConnected = false; });
		return () => { closeEvents(); closeLogs(); };
	});

	function handleScroll() {
		if (!logsEl) return;
		follow = logsEl.scrollHeight - logsEl.scrollTop - logsEl.clientHeight < 32;
	}

	async function cancel() {
		if (!jobQuery.data || !isActiveState(jobQuery.data.state)) return;
		cancelling = true;
		try { await cancelJob(jobId); await jobQuery.refresh(); toast.success("Cancellation requested"); }
		catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not cancel job"); }
		finally { cancelling = false; }
	}

	async function download() {
		downloading = true;
		try { await downloadJobLogs(jobId); }
		catch { toast.error("Could not download job logs"); }
		finally { downloading = false; }
	}
</script>

<div class="page-stack">
	<PageHeader title="Job detail" description={jobId}>
		{#snippet actions()}
			{#if !jobQuery.data || jobQuery.data.logAvailable !== false}
				<Button variant="outline" size="sm" onclick={download} disabled={downloading}><DownloadIcon class="size-4" />{downloading ? "Preparing…" : "Download logs"}</Button>
			{/if}
			{#if jobQuery.data && isActiveState(jobQuery.data.state)}<Button variant="destructive" size="sm" onclick={cancel} disabled={cancelling}><CircleStopIcon class="size-4" />{cancelling ? "Cancelling…" : "Cancel job"}</Button>{/if}
		{/snippet}
	</PageHeader>

	{#if jobQuery.loading && !jobQuery.data}<Skeleton class="h-72 w-full" />
	{:else if jobQuery.error}<ErrorState message={jobQuery.error} onRetry={jobQuery.refresh} />
	{:else if jobQuery.data}
		<div class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm">
			<JobStateBadge state={jobQuery.data.state} />
			<span><span class="text-muted-foreground">Workflow</span> {jobQuery.data.workflowId ?? "Deleted"}</span>
			<span><span class="text-muted-foreground">Queued</span> {formatDateTime(jobQuery.data.queuedAt)}</span>
			<span><span class="text-muted-foreground">Duration</span> {formatDuration(jobQuery.data)}</span>
		</div>

		<Card>
			<CardHeader><CardTitle class="text-sm">Steps</CardTitle></CardHeader>
			<CardContent class="p-0">
				<Table><TableHeader><TableRow><TableHead>Step</TableHead><TableHead>State</TableHead><TableHead>Attempt</TableHead><TableHead>Started</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader><TableBody>
					{#each jobQuery.data.children as child (child.id)}
						<TableRow><TableCell><div class="flex items-center gap-2"><span class="bg-muted block size-2 rounded-full"></span><span class="font-medium">{child.stepId ?? child.id}</span></div>{#if child.error}<p class="text-destructive mt-1 max-w-2xl text-xs">{child.error}</p>{/if}</TableCell><TableCell><JobStateBadge state={child.state} /></TableCell><TableCell>{child.attempt}</TableCell><TableCell>{formatDateTime(child.startedAt)}</TableCell><TableCell>{formatDuration(child)}</TableCell></TableRow>
					{/each}
				</TableBody></Table>
				{#if jobQuery.data.children.length === 0}<p class="text-muted-foreground p-4 text-sm">The runner has not created step jobs yet.</p>{/if}
			</CardContent>
		</Card>

		{#if jobQuery.data.logAvailable === false}
			<Card>
				<CardHeader><CardTitle class="text-sm">Live logs</CardTitle></CardHeader>
				<CardContent>
					<p class="text-muted-foreground text-sm">Logs are stored on host {jobQuery.data.originHost ?? "another host"}.</p>
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader class="flex-row items-center justify-between"><div><CardTitle class="text-sm">Live logs</CardTitle><p class="text-muted-foreground mt-1 text-xs">Replay and live output from all steps.</p></div><Badge variant="outline">{streamConnected ? "Live" : "Reconnecting"}</Badge></CardHeader>
				<CardContent class="relative p-0">
					<div bind:this={logsEl} onscroll={handleScroll} class="h-[28rem] overflow-auto bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100" aria-live="polite">
						{#if !stdout && !stderr}<span class="text-zinc-500">Waiting for output…</span>{/if}
						{#if stdout}<pre class="whitespace-pre-wrap break-words">{stdout}</pre>{/if}
						{#if stderr}<pre class="mt-2 whitespace-pre-wrap break-words text-red-300">{stderr}</pre>{/if}
					</div>
					{#if !follow}<Button size="sm" class="absolute right-4 bottom-4" onclick={() => { follow = true; void scrollToEnd(); }}><ArrowDownIcon class="size-4" />Resume live output</Button>{/if}
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
