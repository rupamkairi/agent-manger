<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { SyncFileState } from "@weave/shared";

	let { state }: { state: SyncFileState } = $props();

	const labels: Record<SyncFileState, string> = {
		same: "Same",
		modified: "Modified",
		"left-only": "Left only",
		"right-only": "Right only",
	};
</script>

{#if state === "same"}
	<span class="text-muted-foreground text-xs">{labels[state]}</span>
{:else if state === "modified"}
	<Badge variant="secondary">{labels[state]}</Badge>
{:else}
	<Badge variant="outline">{labels[state]}</Badge>
{/if}
