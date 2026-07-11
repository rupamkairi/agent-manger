<script lang="ts">
	import * as Command from "$lib/components/ui/command";
	import { navigate } from "$lib/router.svelte";
	import { routes } from "../../../routes";
	import { createQuery } from "$lib/state/query.svelte";
	import { listWorkflows } from "$lib/api/endpoints";
	import RunWorkflowDialog from "$lib/components/workflows/RunWorkflowDialog.svelte";
	import PlayIcon from "@lucide/svelte/icons/play";

	let { open = $bindable(false) }: { open?: boolean } = $props();
	const navigableRoutes = routes.filter((route) => !route.path.includes(":"));
	const workflowsQuery = createQuery(() => listWorkflows(), { silent: true });
	let runOpen = $state(false);
	let workflowId = $state<string | null>(null);

	$effect(() => {
		if (open) void workflowsQuery.refresh();
	});

	function select(path: string) {
		navigate(path);
		open = false;
	}

	function selectWorkflow(id: string) {
		workflowId = id;
		open = false;
		setTimeout(() => (runOpen = true), 0);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			open = !open;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<Command.Dialog bind:open>
	<Command.Input placeholder="Jump to a page..." />
	<Command.List>
		<Command.Empty>No matching page.</Command.Empty>
		<Command.Group heading="Pages">
			{#each navigableRoutes as route (route.path)}
				<Command.Item value={route.title} onSelect={() => select(route.path)}>
					{route.title}
				</Command.Item>
			{/each}
		</Command.Group>
		{#if workflowsQuery.data?.length}
			<Command.Separator />
			<Command.Group heading="Run workflow">
				{#each workflowsQuery.data as workflow (workflow.id)}
					<Command.Item value={`Run workflow ${workflow.name}`} onSelect={() => selectWorkflow(workflow.id)}><PlayIcon class="size-4" />{workflow.name}</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>

<RunWorkflowDialog bind:open={runOpen} {workflowId} />
