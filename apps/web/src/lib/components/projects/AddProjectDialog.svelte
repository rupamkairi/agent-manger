<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
	} from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { toast } from "svelte-sonner";
	import { addProject } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { invalidateProjectCatalog } from "$lib/state/app-state.svelte";

	let {
		open = $bindable(false),
		onSuccess,
	}: {
		open?: boolean;
		onSuccess?: () => void;
	} = $props();

	let rootPath = $state("");
	let name = $state("");
	let submitting = $state(false);

	function reset() {
		rootPath = "";
		name = "";
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!rootPath.trim()) {
			toast.error("Project path is required");
			return;
		}
		submitting = true;
		try {
			await addProject({
				rootPath: rootPath.trim(),
				name: name.trim() ? name.trim() : undefined,
			});
			invalidateProjectCatalog();
			toast.success("Project added");
			onSuccess?.();
			reset();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to add project";
			toast.error(message);
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<form onsubmit={handleSubmit}>
			<DialogHeader>
				<DialogTitle>Add project</DialogTitle>
				<DialogDescription>Track a project so Weave can scan its resources.</DialogDescription>
			</DialogHeader>
			<div class="flex flex-col gap-4 py-4">
				<div class="flex flex-col gap-2">
					<Label for="project-root-path">Path</Label>
					<Input
						id="project-root-path"
						placeholder="/path/to/project"
						bind:value={rootPath}
						required
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="project-name">Name (optional)</Label>
					<Input id="project-name" placeholder="My project" bind:value={name} />
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={submitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? "Adding…" : "Add project"}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
