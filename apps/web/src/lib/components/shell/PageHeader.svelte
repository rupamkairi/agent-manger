<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		description,
		actions,
	}: {
		title: string;
		description?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
	<div class="min-w-0">
		<h1 class="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
		{#if description}
			<p class="text-muted-foreground mt-1 max-w-2xl text-sm leading-5">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
			{@render actions()}
		</div>
	{/if}
</div>
