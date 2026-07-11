<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
	import { TableRow, TableCell, TableHead } from "$lib/components/ui/table";
	import { Button } from "$lib/components/ui/button";
	import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "$lib/components/ui/tooltip";
	import { createQuery } from "$lib/state/query.svelte";
	import { listAgents, detectAllAgents } from "$lib/api/endpoints";
	import { getSelectedProjectId, scopeQueryParams } from "$lib/state/app-state.svelte";
	import { navigate } from "$lib/router.svelte";
	import { toast } from "svelte-sonner";
	import type { AgentInfo } from "@weave/shared";

	const agentsQuery = createQuery(() => listAgents(scopeQueryParams()));

	$effect(() => {
		getSelectedProjectId();
		agentsQuery.refresh();
	});

	let detecting = $state(false);

	function truncatePath(path: string | null, max = 32): string {
		if (!path) return "—";
		if (path.length <= max) return path;
		return `…${path.slice(path.length - max + 1)}`;
	}

	async function refreshDetection() {
		detecting = true;
		try {
			await detectAllAgents();
			await agentsQuery.refresh();
			toast.success("Agent detection refreshed");
		} catch {
			// createQuery/fetchJson already surfaces the error toast
		} finally {
			detecting = false;
		}
	}

	function goToAgent(agent: AgentInfo) {
		navigate(`/agents/${agent.id}`);
	}
</script>

<TooltipProvider>
	<div class="page-stack">
		<PageHeader title="Agents" description="Detected coding agents on this machine.">
			{#snippet actions()}
				<Button size="sm" onclick={refreshDetection} disabled={detecting}>
					{detecting ? "Refreshing…" : "Refresh detection"}
				</Button>
			{/snippet}
		</PageHeader>

		{#if agentsQuery.error}
			<ErrorState message={agentsQuery.error} onRetry={agentsQuery.refresh} />
		{:else}
			<DataTable
				items={agentsQuery.data}
				loading={agentsQuery.loading}
				columns={8}
				emptyTitle="No agents found"
				emptyDescription="Run detection to see agent status."
			>
				{#snippet header()}
					<TableHead>Name</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Version</TableHead>
					<TableHead>Binary path</TableHead>
					<TableHead>Skills</TableHead>
					<TableHead>Instructions</TableHead>
					<TableHead>Memory</TableHead>
					<TableHead>Configs</TableHead>
				{/snippet}
				{#snippet row(agent)}
					<TableRow
						class="cursor-pointer"
						role="button"
						tabindex={0}
						onclick={() => goToAgent(agent)}
						onkeydown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								goToAgent(agent);
							}
						}}
					>
						<TableCell class="font-medium">{agent.name}</TableCell>
						<TableCell>
							<StatusBadge state={agent.detection?.state ?? "unknown"} />
						</TableCell>
						<TableCell>{agent.detection?.version ?? "—"}</TableCell>
						<TableCell class="font-mono text-xs">
							{#if agent.detection?.binaryPath}
								<Tooltip>
									<TooltipTrigger>
										{truncatePath(agent.detection.binaryPath)}
									</TooltipTrigger>
									<TooltipContent>{agent.detection.binaryPath}</TooltipContent>
								</Tooltip>
							{:else}
								—
							{/if}
						</TableCell>
						<TableCell>{agent.resourceCounts.skills}</TableCell>
						<TableCell>{agent.resourceCounts.instructions}</TableCell>
						<TableCell>{agent.resourceCounts.memory}</TableCell>
						<TableCell>{agent.resourceCounts.configs}</TableCell>
					</TableRow>
				{/snippet}
			</DataTable>
		{/if}
	</div>
</TooltipProvider>
