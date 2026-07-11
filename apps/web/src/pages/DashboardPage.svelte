<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import StatCard from "$lib/components/shared/StatCard.svelte";
	import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
	import { Card, CardHeader, CardTitle, CardContent } from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Button } from "$lib/components/ui/button";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { createQuery } from "$lib/state/query.svelte";
	import { getHealth, listAgents, listProjects, listJobs, listSchedules, listWorkflows, scanGlobal } from "$lib/api/endpoints";
	import {
		getProjectCatalogVersion,
		getSelectedProjectId,
		scopeQueryParams,
	} from "$lib/state/app-state.svelte";
	import { ApiError } from "$lib/api/client";
	import { toast } from "svelte-sonner";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import { navigate } from "$lib/router.svelte";
	import JobStateBadge from "$lib/components/workflows/JobStateBadge.svelte";
	import { formatDateTime, formatDuration } from "$lib/workflows/format";

	const healthQuery = createQuery(() => getHealth(scopeQueryParams()));
	const agentsQuery = createQuery(() => listAgents(scopeQueryParams()));
	const projectsQuery = createQuery(() => listProjects());
	const jobsQuery = createQuery(() => listJobs(), { silent: true });
	const schedulesQuery = createQuery(() => listSchedules(), { silent: true });
	const workflowsQuery = createQuery(() => listWorkflows(), { silent: true });
	let rescanning = $state(false);

	$effect(() => {
		scopeQueryParams();
		healthQuery.refresh();
		agentsQuery.refresh();
	});

	$effect(() => {
		getProjectCatalogVersion();
		projectsQuery.refresh();
	});

	const selectedProjectId = $derived(getSelectedProjectId());
	const visibleProjects = $derived(
		selectedProjectId
			? (projectsQuery.data ?? []).filter((project) => project.id === selectedProjectId)
			: (projectsQuery.data ?? []),
	);

	const agentSummary = $derived.by(() => {
		const agents = agentsQuery.data ?? [];
		const installed = agents.filter((a) => a.detection?.state === "installed").length;
		const missing = agents.filter((a) => a.detection?.state === "missing").length;
		return { installed, missing, total: agents.length };
	});
	const runningJobs = $derived((jobsQuery.data ?? []).filter((job) => !job.parentJobId && (job.state === "queued" || job.state === "running")).slice(0, 4));
	const recentFailures = $derived((jobsQuery.data ?? []).filter((job) => !job.parentJobId && job.state === "failed").sort((a, b) => new Date(b.endedAt ?? b.queuedAt).getTime() - new Date(a.endedAt ?? a.queuedAt).getTime()).slice(0, 4));
	const nextSchedules = $derived((schedulesQuery.data ?? []).filter((schedule) => schedule.enabled && schedule.nextRunAt).sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime()).slice(0, 4));
	function workflowName(id: string | null) { return workflowsQuery.data?.find((workflow) => workflow.id === id)?.name ?? id ?? "Deleted workflow"; }

	function formatDate(value: string | null) {
		if (!value) return "Never";
		return new Date(value).toLocaleString();
	}

	async function rescanGlobal() {
		if (rescanning) return;
		rescanning = true;
		try {
			const result = await scanGlobal();
			await Promise.all([healthQuery.refresh(), agentsQuery.refresh()]);
			toast.success(`Global scan complete: found ${result.resourceCount} resource(s)`);
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to scan global resources");
		} finally {
			rescanning = false;
		}
	}
</script>

<div class="page-stack">
	<PageHeader title="Dashboard" description="Overview of projects, agents, and health.">
		{#snippet actions()}
			<Button size="sm" onclick={rescanGlobal} disabled={rescanning}>
				<RefreshCwIcon class={rescanning ? "size-4 animate-spin" : "size-4"} />
				{rescanning ? "Scanning…" : "Rescan global"}
			</Button>
		{/snippet}
	</PageHeader>

	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between"><h2 class="section-heading">Automation</h2><Button variant="ghost" size="sm" onclick={() => navigate("/jobs")}>View all jobs<ArrowRightIcon class="size-4" /></Button></div>
		<div class="grid gap-4 lg:grid-cols-3">
			<Card>
				<CardHeader><CardTitle class="text-sm font-medium">Running now</CardTitle></CardHeader>
				<CardContent class="flex flex-col gap-1 p-0">
					{#if runningJobs.length === 0}<p class="text-muted-foreground px-4 pb-4 text-sm">No workflows are running.</p>{/if}
					{#each runningJobs as job (job.id)}<button class="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onclick={() => navigate(`/jobs/${job.id}`)}><div class="min-w-0"><p class="truncate text-sm font-medium">{workflowName(job.workflowId)}</p><p class="text-muted-foreground text-xs">{formatDuration(job)}</p></div><JobStateBadge state={job.state} /></button>{/each}
				</CardContent>
			</Card>
			<Card>
				<CardHeader><CardTitle class="text-sm font-medium">Next schedules</CardTitle></CardHeader>
				<CardContent class="flex flex-col gap-1 p-0">
					{#if nextSchedules.length === 0}<p class="text-muted-foreground px-4 pb-4 text-sm">No upcoming scheduled runs.</p>{/if}
					{#each nextSchedules as schedule (schedule.id)}<button class="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onclick={() => navigate("/schedules")}><p class="truncate text-sm font-medium">{workflowName(schedule.workflowId)}</p><span class="text-muted-foreground shrink-0 text-xs">{formatDateTime(schedule.nextRunAt)}</span></button>{/each}
				</CardContent>
			</Card>
			<Card>
				<CardHeader><CardTitle class="text-sm font-medium">Recent failures</CardTitle></CardHeader>
				<CardContent class="flex flex-col gap-1 p-0">
					{#if recentFailures.length === 0}<p class="text-muted-foreground px-4 pb-4 text-sm">No recent workflow failures.</p>{/if}
					{#each recentFailures as job (job.id)}<button class="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onclick={() => navigate(`/jobs/${job.id}`)}><p class="truncate text-sm font-medium">{workflowName(job.workflowId)}</p><span class="text-muted-foreground shrink-0 text-xs">{formatDateTime(job.endedAt)}</span></button>{/each}
				</CardContent>
			</Card>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="section-heading">Health</h2>
		{#if healthQuery.loading}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<Skeleton class="h-24 w-full" />
				{/each}
			</div>
		{:else if healthQuery.error}
			<ErrorState message={healthQuery.error} onRetry={healthQuery.refresh} />
		{:else}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard label="Errors" value={healthQuery.data?.counts.error ?? 0} />
				<StatCard label="Warnings" value={healthQuery.data?.counts.warning ?? 0} />
				<StatCard label="Info" value={healthQuery.data?.counts.info ?? 0} />
				<StatCard label="Unknown" value={healthQuery.data?.counts.unknown ?? 0} />
			</div>
		{/if}
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="section-heading">Quick Links</h2>
		<Card>
			<CardContent class="p-4">
				<button class="flex items-center gap-2 text-sm" onclick={() => navigate("/coomer")}>
					<span>Coomer</span>
					<ArrowRightIcon class="size-4" />
				</button>
			</CardContent>
		</Card>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="section-heading">Agents</h2>
		{#if agentsQuery.loading}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
				{#each Array(3) as _, i (i)}
					<Skeleton class="h-24 w-full" />
				{/each}
			</div>
		{:else if agentsQuery.error}
			<ErrorState message={agentsQuery.error} onRetry={agentsQuery.refresh} />
		{:else if !agentsQuery.data || agentsQuery.data.length === 0}
			<EmptyState title="No agents detected" description="Run detection to see agent status here." />
		{:else}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
				<StatCard label="Installed" value={agentSummary.installed} />
				<StatCard label="Missing" value={agentSummary.missing} />
				<StatCard label="Total agents" value={agentSummary.total} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle class="text-sm font-medium">Agent status</CardTitle>
				</CardHeader>
				<CardContent class="flex flex-wrap gap-2">
					{#each agentsQuery.data as agent (agent.id)}
						<div class="flex items-center gap-2 rounded-md border px-2 py-1">
							<span class="text-sm">{agent.name}</span>
							<StatusBadge state={agent.detection?.state ?? "unknown"} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}
	</section>

		<section class="flex flex-col gap-3">
		<h2 class="section-heading">{selectedProjectId ? "Current project" : "Projects"}</h2>
		{#if projectsQuery.loading}
			<Skeleton class="h-40 w-full" />
		{:else if projectsQuery.error}
			<ErrorState message={projectsQuery.error} onRetry={projectsQuery.refresh} />
			{:else if visibleProjects.length === 0}
				<EmptyState
					title={selectedProjectId ? "Selected project is unavailable" : "No projects yet"}
					description={
						selectedProjectId
							? "Choose another project or switch back to Global."
							: "Add a project to start tracking it here."
					}
				/>
		{:else}
			<div class="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Path</TableHead>
							<TableHead>Last scanned</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each visibleProjects as project (project.id)}
							<TableRow>
								<TableCell>{project.name}</TableCell>
								<TableCell class="text-muted-foreground font-mono text-xs">{project.rootPath}</TableCell>
								<TableCell>{formatDate(project.lastScannedAt)}</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		{/if}
	</section>
</div>
