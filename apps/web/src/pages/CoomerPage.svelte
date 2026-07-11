<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
	import RadarIcon from "@lucide/svelte/icons/radar";
</script>

<div class="page-stack">
	<PageHeader title="Coomer" description="Discover and track resources across your workspace." />

	<EmptyState title="Coming soon" description="This page is under development. Check back later for resource tracking functionality.">
		{#snippet icon()}
			<RadarIcon class="size-12" />
		{/snippet}
	</EmptyState>
</div>
