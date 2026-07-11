<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
</script>

<div class="page-stack">
	<PageHeader title="Not found" />
	<EmptyState title="Page not found" description="The page you're looking for doesn't exist." />
</div>
