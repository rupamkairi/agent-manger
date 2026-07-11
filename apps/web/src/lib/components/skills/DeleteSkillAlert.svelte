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
	import { deleteSkill } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import type { SkillResource } from "@weave/shared";

	let {
		open = $bindable(false),
		skill,
		onDeleted,
	}: {
		open?: boolean;
		skill: SkillResource | null;
		onDeleted?: () => void;
	} = $props();

	let deleting = $state(false);

	async function handleConfirm() {
		if (!skill) return;
		deleting = true;
		try {
			await deleteSkill(skill.id);
			toast.success(`Deleted "${skill.skill.name ?? skill.skill.dirName}" from this location`);
			onDeleted?.();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to delete skill";
			toast.error(message);
		} finally {
			deleting = false;
		}
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete this copy?</AlertDialogTitle>
			<AlertDialogDescription>
				This deletes the copy of "{skill?.skill.name ?? skill?.skill.dirName}" at
				<span class="font-mono">{skill?.path}</span>. Other copies of this skill are not affected.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirm} disabled={deleting} variant="destructive">
				{deleting ? "Deleting…" : "Delete"}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
