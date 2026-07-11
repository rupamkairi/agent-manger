<script lang="ts">
	import FileResourcePage from "$lib/components/resources/FileResourcePage.svelte";
	import InstructionConflictsCard from "$lib/components/instructions/InstructionConflictsCard.svelte";
	import { listInstructions, listInstructionConflicts } from "$lib/api/endpoints";
	import { createQuery } from "$lib/state/query.svelte";
	import { scopeQueryParams, getResourceVersion } from "$lib/state/app-state.svelte";

	let pageRef: { openResourceById: (resourceId: string) => void } | undefined = $state();

	const conflictsQuery = createQuery(() => listInstructionConflicts(scopeQueryParams()), {
		silent: true,
	});

	$effect(() => {
		scopeQueryParams();
		getResourceVersion();
		conflictsQuery.refresh();
	});

	function openFile(resourceId: string) {
		pageRef?.openResourceById(resourceId);
	}
</script>

<div class="page-stack">
	{#if conflictsQuery.data && conflictsQuery.data.length > 0}
		<InstructionConflictsCard conflicts={conflictsQuery.data} onOpenFile={openFile} />
	{/if}

	<FileResourcePage
		bind:this={pageRef}
		title="Instructions"
		description="Instruction files across agents."
		fetcher={listInstructions}
		fileName={(item) => item.instruction.fileName}
		isEmpty={(item) => item.instruction.isEmpty}
		kind="instruction"
		editorLanguage={() => "markdown"}
		canCreate
	/>
</div>
