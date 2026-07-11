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
	import { removeProject } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import {
		getSelectedProjectId,
		invalidateProjectCatalog,
		setSelectedProjectId,
	} from "$lib/state/app-state.svelte";
	import type { Project } from "@weave/shared";

	let {
		open = $bindable(false),
		project,
		onSuccess,
	}: {
		open?: boolean;
		project: Project | null;
		onSuccess?: () => void;
	} = $props();

	let removing = $state(false);

	async function handleConfirm() {
		if (!project) return;
		removing = true;
		try {
			await removeProject(project.id);
			if (getSelectedProjectId() === project.id) setSelectedProjectId(null);
			invalidateProjectCatalog();
			toast.success(`Removed "${project.name}" from tracking`);
			onSuccess?.();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to remove project";
			toast.error(message);
		} finally {
			removing = false;
		}
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Remove project?</AlertDialogTitle>
			<AlertDialogDescription>
				This removes "{project?.name}" from Weave's tracking list only. Files on disk at
				<span class="font-mono">{project?.rootPath}</span> are not deleted or changed.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirm} disabled={removing}>
				{removing ? "Removing…" : "Remove"}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
