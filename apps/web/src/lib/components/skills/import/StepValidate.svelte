<script lang="ts">
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "$lib/components/ui/table";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import type { SkillLoadResult } from "@weave/shared";

	let { result }: { result: SkillLoadResult } = $props();
</script>

<div class="flex flex-col gap-4">
	<div class="grid grid-cols-2 gap-3 text-sm">
		<div>
			<p class="text-muted-foreground text-xs">Name</p>
			<p class="font-medium">{result.name}</p>
		</div>
		<div>
			<p class="text-muted-foreground text-xs">Description</p>
			<p>{result.description ?? "—"}</p>
		</div>
	</div>

	<div class="flex flex-col gap-1">
		<h3 class="text-sm font-medium">Files ({result.files.length})</h3>
		<ScrollArea class="h-40 rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Path</TableHead>
						<TableHead>Size</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each result.files as file (file.path)}
						<TableRow>
							<TableCell class="font-mono text-xs">{file.path}</TableCell>
							<TableCell class="text-muted-foreground text-xs">{file.size} B</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</ScrollArea>
	</div>

	{#if result.issues.length > 0}
		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-medium">Validation issues</h3>
			{#each result.issues as issue, i (i)}
				<Alert variant={issue.severity === "error" ? "destructive" : "default"}>
					<AlertTitle>{issue.code}</AlertTitle>
					<AlertDescription>
						<p>{issue.message}</p>
						{#if issue.file}
							<p class="mt-1 font-mono text-xs">{issue.file}</p>
						{/if}
					</AlertDescription>
				</Alert>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground text-sm">No validation issues.</p>
	{/if}

	{#if !result.installable}
		<Alert variant="destructive">
			<AlertTitle>Not installable</AlertTitle>
			<AlertDescription>Fix the errors above before installing this skill.</AlertDescription>
		</Alert>
	{/if}
</div>
