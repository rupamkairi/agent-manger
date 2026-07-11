<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";

	let {
		onReload,
		onOverwrite,
		reloading = false,
		overwriting = false,
	}: {
		onReload: () => void;
		onOverwrite: () => void;
		reloading?: boolean;
		overwriting?: boolean;
	} = $props();
</script>

<Alert variant="destructive">
	<AlertTitle>File changed on disk</AlertTitle>
	<AlertDescription class="flex flex-col gap-3">
		<p>This file changed on disk since you opened it.</p>
		<div class="flex gap-2">
			<Button size="sm" variant="outline" onclick={onReload} disabled={reloading || overwriting}>
				{reloading ? "Reloading…" : "Reload file"}
			</Button>
			<Button size="sm" variant="destructive" onclick={onOverwrite} disabled={reloading || overwriting}>
				{overwriting ? "Overwriting…" : "Overwrite anyway"}
			</Button>
		</div>
	</AlertDescription>
</Alert>
