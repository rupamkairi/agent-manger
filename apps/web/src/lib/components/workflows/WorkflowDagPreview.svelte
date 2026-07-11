<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import type { WorkflowStep } from "@weave/shared";

	let { steps }: { steps: WorkflowStep[] } = $props();

	const levels = $derived.by(() => {
		const assigned = new Map<string, number>();
		const remaining = new Set(steps.map((step) => step.id));
		for (let pass = 0; pass < steps.length && remaining.size; pass += 1) {
			for (const step of steps) {
				if (!remaining.has(step.id)) continue;
				if (step.after.every((id) => assigned.has(id))) {
					assigned.set(step.id, step.after.length ? Math.max(...step.after.map((id) => assigned.get(id) ?? 0)) + 1 : 0);
					remaining.delete(step.id);
				}
			}
		}
		const max = Math.max(0, ...assigned.values());
		return Array.from({ length: max + 1 }, (_, level) => steps.filter((step) => assigned.get(step.id) === level));
	});
</script>

<div class="overflow-x-auto rounded-lg border bg-muted/20 p-3" aria-label="Workflow dependency graph">
	<div class="flex min-w-max items-stretch gap-2">
		{#each levels as level, index (index)}
			<div class="flex w-48 flex-col justify-center gap-2">
				{#each level as step (step.id)}
					<div class="rounded-md border bg-card px-3 py-2">
						<p class="truncate text-sm font-medium">{step.name || step.id}</p>
						<div class="mt-1 flex items-center gap-1">
							<Badge variant="outline" class="font-mono text-[10px]">{step.id}</Badge>
							<span class="text-muted-foreground text-[11px]">{step.agentId}</span>
						</div>
						<p class="text-muted-foreground mt-1 truncate text-[11px]" title={step.after.join(", ") || "Starts immediately"}>
							{step.after.length ? `After: ${step.after.join(", ")}` : "Starts immediately"}
						</p>
					</div>
				{/each}
			</div>
			{#if index < levels.length - 1}
				<div class="text-muted-foreground flex items-center px-1"><ArrowRightIcon class="size-4" /></div>
			{/if}
		{/each}
	</div>
</div>
