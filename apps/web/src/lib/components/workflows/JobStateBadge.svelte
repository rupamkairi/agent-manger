<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { JobState } from "@weave/shared";

	let { state }: { state: JobState } = $props();
	const label = $derived(state.charAt(0).toUpperCase() + state.slice(1));
</script>

{#if state === "failed" || state === "cancelled"}
	<Badge variant="destructive">{label}</Badge>
{:else if state === "succeeded"}
	<Badge variant="secondary">{label}</Badge>
{:else if state === "running"}
	<Badge variant="default">{label}</Badge>
{:else}
	<Badge variant="outline">{label}</Badge>
{/if}
