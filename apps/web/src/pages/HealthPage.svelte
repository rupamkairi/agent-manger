<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import SeverityBadge from "$lib/components/shared/SeverityBadge.svelte";
	import StatCard from "$lib/components/shared/StatCard.svelte";
	import { TableRow, TableCell, TableHead } from "$lib/components/ui/table";
	import { Button } from "$lib/components/ui/button";
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
	} from "$lib/components/ui/select";
	import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "$lib/components/ui/tooltip";
	import { createQuery } from "$lib/state/query.svelte";
	import { getHealth } from "$lib/api/endpoints";
	import { scopeQueryParams } from "$lib/state/app-state.svelte";
	import type { HealthIssue, HealthSeverity } from "@weave/shared";

	const healthQuery = createQuery(() => getHealth(scopeQueryParams()));

	$effect(() => {
		scopeQueryParams();
		healthQuery.refresh();
	});

	let refreshing = $state(false);
	let severityFilter = $state<"all" | HealthSeverity>("all");
	let sourceFilter = $state<"all" | HealthIssue["source"]>("all");

	const severityOptions: { value: "all" | HealthSeverity; label: string }[] = [
		{ value: "all", label: "All severities" },
		{ value: "info", label: "Info" },
		{ value: "warning", label: "Warning" },
		{ value: "error", label: "Error" },
		{ value: "unknown", label: "Unknown" },
	];

	const sourceOptions: { value: "all" | HealthIssue["source"]; label: string }[] = [
		{ value: "all", label: "All sources" },
		{ value: "agent-detection", label: "Agent detection" },
		{ value: "skill-validation", label: "Skill validation" },
		{ value: "resource-scan", label: "Resource scan" },
		{ value: "project", label: "Project" },
	];

	function sourceLabel(source: HealthIssue["source"]): string {
		return sourceOptions.find((o) => o.value === source)?.label ?? source;
	}

	function severityLabel(value: "all" | HealthSeverity): string {
		return severityOptions.find((o) => o.value === value)?.label ?? "All severities";
	}

	function sourceFilterLabel(value: "all" | HealthIssue["source"]): string {
		return sourceOptions.find((o) => o.value === value)?.label ?? "All sources";
	}

	const filteredIssues = $derived(
		(healthQuery.data?.issues ?? []).filter((issue) => {
			if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
			if (sourceFilter !== "all" && issue.source !== sourceFilter) return false;
			return true;
		}),
	);

	function formatRelative(iso: string): string {
		const date = new Date(iso);
		const diffMs = Date.now() - date.getTime();
		const diffSec = Math.round(diffMs / 1000);
		const diffMin = Math.round(diffSec / 60);
		const diffHour = Math.round(diffMin / 60);
		const diffDay = Math.round(diffHour / 24);

		if (Math.abs(diffSec) < 60) return "just now";
		if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
		if (Math.abs(diffHour) < 24) return `${diffHour}h ago`;
		return `${diffDay}d ago`;
	}

	async function refresh() {
		refreshing = true;
		try {
			await healthQuery.refresh();
		} finally {
			refreshing = false;
		}
	}
</script>

<TooltipProvider>
	<div class="page-stack">
		<PageHeader title="Health" description="Issues detected across projects and agents.">
			{#snippet actions()}
				<Button size="sm" onclick={refresh} disabled={refreshing}>
					{refreshing ? "Refreshing…" : "Refresh"}
				</Button>
			{/snippet}
		</PageHeader>

		{#if healthQuery.error}
			<ErrorState message={healthQuery.error} onRetry={healthQuery.refresh} />
		{:else}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard label="Info" value={healthQuery.data?.counts.info ?? 0} />
				<StatCard label="Warning" value={healthQuery.data?.counts.warning ?? 0} />
				<StatCard label="Error" value={healthQuery.data?.counts.error ?? 0} />
				<StatCard label="Unknown" value={healthQuery.data?.counts.unknown ?? 0} />
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<Select type="single" bind:value={severityFilter}>
					<SelectTrigger class="w-44">
						{severityLabel(severityFilter)}
					</SelectTrigger>
					<SelectContent>
						{#each severityOptions as option (option.value)}
							<SelectItem value={option.value} label={option.label} />
						{/each}
					</SelectContent>
				</Select>

				<Select type="single" bind:value={sourceFilter}>
					<SelectTrigger class="w-52">
						{sourceFilterLabel(sourceFilter)}
					</SelectTrigger>
					<SelectContent>
						{#each sourceOptions as option (option.value)}
							<SelectItem value={option.value} label={option.label} />
						{/each}
					</SelectContent>
				</Select>
			</div>

			<DataTable
				items={filteredIssues}
				loading={healthQuery.loading}
				columns={5}
				emptyTitle="No issues found"
				emptyDescription="Everything looks clean for the current filters."
			>
				{#snippet header()}
					<TableHead>Severity</TableHead>
					<TableHead>Source</TableHead>
					<TableHead>Agent</TableHead>
					<TableHead>Message</TableHead>
					<TableHead>Detected</TableHead>
				{/snippet}
				{#snippet row(issue)}
					<TableRow>
						<TableCell>
							<SeverityBadge severity={issue.severity} />
						</TableCell>
						<TableCell>{sourceLabel(issue.source)}</TableCell>
						<TableCell>{issue.agentId ?? "—"}</TableCell>
						<TableCell class="max-w-md">{issue.message}</TableCell>
						<TableCell>
							<Tooltip>
								<TooltipTrigger class="text-sm">
									{formatRelative(issue.detectedAt)}
								</TooltipTrigger>
								<TooltipContent>{issue.detectedAt}</TooltipContent>
							</Tooltip>
						</TableCell>
					</TableRow>
				{/snippet}
			</DataTable>
		{/if}
	</div>
</TooltipProvider>
