<script lang="ts">
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

	let {
		message = "Something went wrong.",
		onRetry,
	}: {
		message?: string;
		onRetry?: () => void;
	} = $props();
</script>

<Alert variant="destructive">
	<TriangleAlertIcon class="size-4" />
	<AlertTitle>Failed to load</AlertTitle>
	<AlertDescription class="flex flex-col items-start gap-2">
		<p>{message}</p>
		{#if onRetry}
			<Button size="sm" variant="outline" onclick={onRetry}>Retry</Button>
		{/if}
	</AlertDescription>
</Alert>
