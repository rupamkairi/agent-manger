<script lang="ts">
	import { Progress } from "$lib/components/ui/progress";
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import type { TargetResult } from "@weave/shared";

	let {
		installing,
		results,
	}: {
		installing: boolean;
		results: TargetResult[] | null;
	} = $props();
</script>

<div class="flex flex-col gap-4">
	{#if installing}
		<div class="flex flex-col gap-2">
			<p class="text-muted-foreground text-sm">Installing…</p>
			<Progress value={null} />
		</div>
	{:else if results}
		{#each results as result, i (i)}
			<Alert variant={result.ok ? "default" : "destructive"}>
				<AlertTitle>
					{result.target.agentId} · {result.target.scope === "global" ? "Global" : "Project"}
				</AlertTitle>
				<AlertDescription>
					{#if result.ok}
						<p class="font-mono text-xs">{result.installedPath}</p>
					{:else}
						<p>{result.error}</p>
					{/if}
				</AlertDescription>
			</Alert>
		{/each}
	{/if}
</div>
