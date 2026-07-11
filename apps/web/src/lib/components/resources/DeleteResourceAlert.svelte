<script lang="ts">
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogCancel,
		AlertDialogAction,
	} from "$lib/components/ui/alert-dialog";
	import { deleteInstruction, deleteMemory } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { invalidateResources } from "$lib/state/app-state.svelte";
	import { toast } from "svelte-sonner";

	let {
		open = $bindable(false),
		kind,
		resourceId,
		path,
		onDeleted,
	}: {
		open?: boolean;
		kind: "instruction" | "memory";
		resourceId: string;
		path: string;
		onDeleted?: () => void;
	} = $props();

	let deleting = $state(false);

	async function handleConfirm() {
		deleting = true;
		try {
			if (kind === "instruction") await deleteInstruction(resourceId);
			else await deleteMemory(resourceId);
			invalidateResources();
			toast.success("File deleted");
			onDeleted?.();
			open = false;
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to delete file");
		} finally {
			deleting = false;
		}
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete this file?</AlertDialogTitle>
			<AlertDialogDescription>
				This permanently deletes <span class="font-mono">{path}</span> from disk. This cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirm} disabled={deleting}>
				{deleting ? "Deleting…" : "Delete"}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
