<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";

	let {
		content,
		emptyMessage = "No content",
		maxHeight = "24rem",
	}: {
		content: string | null | undefined;
		emptyMessage?: string;
		maxHeight?: string;
	} = $props();
</script>

<ScrollArea class="rounded-md border bg-muted/20" style={`max-height: ${maxHeight}`}>
	{#if content}
		<pre class="text-foreground/85 p-3 text-xs leading-5 whitespace-pre-wrap break-words">{content}</pre>
	{:else}
		<p class="text-muted-foreground p-3 text-sm">{emptyMessage}</p>
	{/if}
</ScrollArea>
