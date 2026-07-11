<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "$lib/components/ui/collapsible";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import type { InstructionConflict } from "@weave/shared";

	let {
		conflicts,
		onOpenFile,
	}: {
		conflicts: InstructionConflict[];
		onOpenFile: (resourceId: string) => void;
	} = $props();

	let open = $state(false);
</script>

{#if conflicts.length > 0}
	<Card>
		<Collapsible bind:open>
			<CollapsibleTrigger class="w-full">
				<CardHeader class="flex flex-row items-center justify-between gap-2">
					<CardTitle class="text-base">Possible conflicts ({conflicts.length})</CardTitle>
					<ChevronDownIcon class={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
				</CardHeader>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<CardContent class="flex flex-col gap-4">
					{#each conflicts as conflict, index (index)}
						<div class="flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0">
							<Badge variant="secondary">{conflict.topic}</Badge>
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="flex flex-col gap-1">
									<Button
										variant="link"
										class="h-auto justify-start p-0 font-mono text-xs"
										onclick={() => onOpenFile(conflict.resourceIdA)}
									>
										{conflict.fileA}
									</Button>
								<blockquote class="text-muted-foreground rounded-md border bg-muted/30 px-3 py-2 text-xs">
										{conflict.excerptA}
									</blockquote>
								</div>
								<div class="flex flex-col gap-1">
									<Button
										variant="link"
										class="h-auto justify-start p-0 font-mono text-xs"
										onclick={() => onOpenFile(conflict.resourceIdB)}
									>
										{conflict.fileB}
									</Button>
								<blockquote class="text-muted-foreground rounded-md border bg-muted/30 px-3 py-2 text-xs">
										{conflict.excerptB}
									</blockquote>
								</div>
							</div>
						</div>
					{/each}
				</CardContent>
			</CollapsibleContent>
		</Collapsible>
	</Card>
{/if}
