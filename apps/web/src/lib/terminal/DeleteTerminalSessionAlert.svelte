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
	import { toast } from "svelte-sonner";
	import { deleteTerminalSession } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import type { TerminalSession } from "@weave/shared";

	let {
		open = $bindable(false),
		session,
		onDeleted,
	}: {
		open?: boolean;
		session: TerminalSession | null;
		onDeleted?: () => void;
	} = $props();

	let deleting = $state(false);

	async function handleConfirm() {
		if (!session) return;
		deleting = true;
		try {
			await deleteTerminalSession(session.id);
			toast.success("Terminal session closed");
			onDeleted?.();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to close terminal session";
			toast.error(message);
		} finally {
			deleting = false;
		}
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Close this session?</AlertDialogTitle>
			<AlertDialogDescription>
				This ends the terminal session at <span class="font-mono">{session?.cwd}</span>. Any running
				process in it is terminated.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirm} disabled={deleting} variant="destructive">
				{deleting ? "Closing…" : "Close"}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
