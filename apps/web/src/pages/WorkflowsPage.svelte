<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import RunWorkflowDialog from "$lib/components/workflows/RunWorkflowDialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
	import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
	import { createQuery } from "$lib/state/query.svelte";
	import { deleteWorkflow, listWorkflows } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { navigate } from "$lib/router.svelte";
	import { toast } from "svelte-sonner";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import PlayIcon from "@lucide/svelte/icons/play";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import type { WorkflowSummary } from "@weave/shared";

	const workflowsQuery = createQuery(() => listWorkflows());
	let runOpen = $state(false);
	let runWorkflowId = $state<string | null>(null);

	function openRun(id: string) { runWorkflowId = id; runOpen = true; }
	async function remove(workflow: WorkflowSummary) {
		if (!confirm(`Delete “${workflow.name}”? Existing job history will remain.`)) return;
		try { await deleteWorkflow(workflow.id); await workflowsQuery.refresh(); toast.success("Workflow deleted"); }
		catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not delete workflow"); }
	}
</script>

<div class="page-stack">
	<PageHeader title="Workflows" description="Build repeatable, dependency-aware agent runs.">
		{#snippet actions()}<Button size="sm" onclick={() => navigate("/workflows/new")}><PlusIcon class="size-4" />New workflow</Button>{/snippet}
	</PageHeader>

	{#if workflowsQuery.error}<ErrorState message={workflowsQuery.error} onRetry={workflowsQuery.refresh} />
	{:else}
		<DataTable items={workflowsQuery.data} loading={workflowsQuery.loading} columns={5} emptyTitle="No workflows yet" emptyDescription="Create a workflow to coordinate agents and their required resources.">
			{#snippet header()}<TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Version</TableHead><TableHead>Updated</TableHead><TableHead class="text-right">Actions</TableHead>{/snippet}
			{#snippet row(workflow)}
				<TableRow class="cursor-pointer" onclick={() => navigate(`/workflows/${workflow.id}/edit`)}>
					<TableCell class="font-medium">{workflow.name}</TableCell>
					<TableCell class="text-muted-foreground max-w-md truncate">{workflow.description || "—"}</TableCell>
					<TableCell>v{workflow.version}</TableCell>
					<TableCell>{new Date(workflow.updatedAt).toLocaleString()}</TableCell>
					<TableCell class="text-right" onclick={(event) => event.stopPropagation()}>
						<div class="flex justify-end gap-1">
							<Button variant="ghost" size="sm" onclick={() => openRun(workflow.id)}><PlayIcon class="size-4" />Run</Button>
							<DropdownMenu><DropdownMenuTrigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon" aria-label="Workflow actions"><EllipsisIcon class="size-4" /></Button>{/snippet}</DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onclick={() => navigate(`/workflows/${workflow.id}/edit`)}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onclick={() => remove(workflow)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
						</div>
					</TableCell>
				</TableRow>
			{/snippet}
		</DataTable>
	{/if}
</div>

<RunWorkflowDialog bind:open={runOpen} workflowId={runWorkflowId} />
