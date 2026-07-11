<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from "$lib/components/ui/card";
	import type { Snippet } from "svelte";

	let {
		label,
		value,
		icon,
	}: {
		label: string;
		value: string | number;
		icon?: Snippet;
	} = $props();
</script>

<Card size="sm" class="min-h-20">
	<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
		<CardTitle class="text-muted-foreground text-sm font-medium">{label}</CardTitle>
		{#if icon}
			<div class="text-muted-foreground">
				{@render icon()}
			</div>
		{/if}
	</CardHeader>
	<CardContent>
		<div class="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
	</CardContent>
</Card>
