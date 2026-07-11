<script lang="ts" generics="T">
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableCell,
	} from "$lib/components/ui/table";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import EmptyState from "./EmptyState.svelte";
	import type { Snippet } from "svelte";

	let {
		items,
		loading = false,
		columns,
		header,
		row,
		emptyTitle = "No results",
		emptyDescription,
		skeletonRows = 5,
	}: {
		items: T[] | undefined;
		loading?: boolean;
		columns: number;
		header: Snippet;
		row: Snippet<[T]>;
		emptyTitle?: string;
		emptyDescription?: string;
		skeletonRows?: number;
	} = $props();
</script>

<div class="overflow-hidden rounded-lg border bg-card">
	<Table class="min-w-[720px]">
		<TableHeader>
			<TableRow>
				{@render header()}
			</TableRow>
		</TableHeader>
		<TableBody>
			{#if loading}
				{#each Array(skeletonRows) as _, i (i)}
					<TableRow>
						{#each Array(columns) as __, j (j)}
							<TableCell>
								<Skeleton class="h-4 w-full" />
							</TableCell>
						{/each}
					</TableRow>
				{/each}
			{:else if items && items.length > 0}
				{#each items as item, i (i)}
					{@render row(item)}
				{/each}
			{/if}
		</TableBody>
	</Table>
	{#if !loading && (!items || items.length === 0)}
		<div class="border-t p-3 sm:p-4">
			<EmptyState title={emptyTitle} description={emptyDescription} />
		</div>
	{/if}
</div>
