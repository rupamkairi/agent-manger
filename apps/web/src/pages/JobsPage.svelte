<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import JobStateBadge from "$lib/components/workflows/JobStateBadge.svelte";
	import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
	import * as Select from "$lib/components/ui/select";
	import { createQuery } from "$lib/state/query.svelte";
	import { listJobs } from "$lib/api/endpoints";
	import { navigate } from "$lib/router.svelte";
	import { formatDateTime, formatDuration, isActiveState } from "$lib/workflows/format";
	import type { JobState } from "@weave/shared";

	const REFRESH_INTERVAL_MS = 5000;

	let state = $state<JobState | undefined>();
	const jobsQuery = createQuery(() => listJobs({ state }));
	const parentJobs = $derived((jobsQuery.data ?? []).filter((job) => !job.parentJobId));
	const hasActiveJob = $derived((jobsQuery.data ?? []).some((job) => isActiveState(job.state)));

	$effect(() => {
		state;
		jobsQuery.refresh();
	});

	$effect(() => {
		if (!hasActiveJob) return;
		const interval = setInterval(() => {
			if (document.visibilityState === "visible") jobsQuery.refresh();
		}, REFRESH_INTERVAL_MS);
		return () => clearInterval(interval);
	});
	function triggerLabel(input: Record<string, unknown>): string {
		const trigger = input._trigger;
		return trigger && typeof trigger === "object" && "kind" in trigger && trigger.kind === "schedule"
			? "Schedule"
			: "Manual";
	}
</script>

<div class="page-stack">
	<PageHeader title="Jobs" description="Run history, live progress, and output for every workflow." />
	<Select.Root type="single" value={state ?? ""} onValueChange={(value) => (state = (value || undefined) as JobState | undefined)}><Select.Trigger class="w-44">{state ? state.charAt(0).toUpperCase() + state.slice(1) : "All states"}</Select.Trigger><Select.Content><Select.Item value="">All states</Select.Item>{#each ["queued", "running", "succeeded", "failed", "cancelled"] as option (option)}<Select.Item value={option}>{option}</Select.Item>{/each}</Select.Content></Select.Root>
	{#if jobsQuery.error}<ErrorState message={jobsQuery.error} onRetry={jobsQuery.refresh} />
	{:else}<DataTable items={parentJobs} loading={jobsQuery.loading} columns={6} emptyTitle="No jobs yet" emptyDescription="Run a workflow to see its progress and logs here.">
		{#snippet header()}<TableHead>Workflow</TableHead><TableHead>State</TableHead><TableHead>Trigger</TableHead><TableHead>Steps</TableHead><TableHead>Queued</TableHead><TableHead>Duration</TableHead>{/snippet}
		{#snippet row(job)}<TableRow class="cursor-pointer" onclick={() => navigate(`/jobs/${job.id}`)}><TableCell class="font-medium">{job.workflowId ?? "Deleted workflow"}</TableCell><TableCell><JobStateBadge state={job.state} /></TableCell><TableCell>{triggerLabel(job.input)}</TableCell><TableCell>{job.stepCount ?? 0}</TableCell><TableCell>{formatDateTime(job.queuedAt)}</TableCell><TableCell>{formatDuration(job)}</TableCell></TableRow>{/snippet}
	</DataTable>{/if}
</div>
