<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import WorkflowEditor from "$lib/components/workflows/WorkflowEditor.svelte";
	import { createWorkflow, getWorkflow, updateWorkflow } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { navigate } from "$lib/router.svelte";
	import { toast } from "svelte-sonner";
	import type { WorkflowDefinition } from "@weave/shared";

	let { params }: { params: Record<string, string> } = $props();
	const workflowId = $derived(params.workflowId ?? null);
	let workflow = $state<WorkflowDefinition | null>(null);
	function initiallyLoading() { return Boolean(params.workflowId); }
	let loading = $state(initiallyLoading());
	let loadError = $state<string | null>(null);
	let saving = $state(false);

	async function load() {
		if (!workflowId) return;
		loading = true; loadError = null;
		try { workflow = await getWorkflow(workflowId); }
		catch (err) { loadError = err instanceof ApiError ? err.message : "Could not load workflow"; }
		finally { loading = false; }
	}
	$effect(() => { if (workflowId) void load(); });

	async function save(definition: WorkflowDefinition) {
		saving = true;
		try {
			if (workflowId) await updateWorkflow(workflowId, definition); else await createWorkflow(definition);
			toast.success(workflowId ? "Workflow updated" : "Workflow created");
			navigate("/workflows");
		} catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not save workflow"); }
		finally { saving = false; }
	}
</script>

<div class="page-stack">
	<PageHeader title={workflowId ? "Edit workflow" : "New workflow"} description="Define inputs, steps, dependencies, retries, and required resources." />
	{#if loading}<Skeleton class="h-[32rem] w-full" />
	{:else if loadError}<ErrorState message={loadError} onRetry={load} />
	{:else}<WorkflowEditor initial={workflow ?? undefined} {saving} onSave={save} onCancel={() => navigate("/workflows")} />{/if}
</div>
