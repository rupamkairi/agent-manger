<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title = "Nothing here yet",
		description,
		icon,
		action,
	}: {
		title?: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	} = $props();
</script>

<div class="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
	{#if icon}
		<div class="text-muted-foreground mb-1">
			{@render icon()}
		</div>
	{/if}
	<p class="text-sm font-semibold">{title}</p>
	{#if description}
		<p class="text-muted-foreground max-w-sm text-sm">{description}</p>
	{/if}
	{#if action}
		<div class="mt-2">
			{@render action()}
		</div>
	{/if}
</div>
