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
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import * as Select from "$lib/components/ui/select";
	import { TableHead, TableRow, TableCell, Table, TableHeader, TableBody } from "$lib/components/ui/table";
	import FileStateBadge from "./FileStateBadge.svelte";
	import { toast } from "svelte-sonner";
	import { getSkillSyncDiff, syncSkill } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { getSelectedProjectId } from "$lib/state/app-state.svelte";
	import type { SkillResource, SyncDiff } from "@weave/shared";

	let {
		open = $bindable(false),
		skill,
		onSynced,
	}: {
		open?: boolean;
		skill: SkillResource | null;
		onSynced?: () => void;
	} = $props();

	type Direction = "left-to-right" | "right-to-left";

	let diff = $state<SyncDiff | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let syncing = $state(false);
	let direction = $state<Direction>("left-to-right");

	const skillName = $derived(skill?.skill.name ?? skill?.skill.dirName ?? "");
	const projectId = $derived(getSelectedProjectId());

	async function load() {
		if (!skill || !projectId) return;
		loading = true;
		error = null;
		try {
			diff = await getSkillSyncDiff({
				skillName,
				leftAgentId: skill.agentId,
				leftScope: "global",
				rightAgentId: skill.agentId,
				rightScope: "project",
				rightProjectId: projectId,
			});
			direction = "left-to-right";
		} catch (err) {
			error = err instanceof ApiError ? err.message : "Failed to load sync diff";
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open) {
			diff = null;
			load();
		}
	});

	async function handleSync() {
		if (!diff) return;
		syncing = true;
		try {
			const from = direction === "left-to-right" ? diff.left : diff.right;
			const to = direction === "left-to-right" ? diff.right : diff.left;
			const result = await syncSkill({ skillName, from, to, confirm: true });
			toast.success(`Synced ${result.copiedFiles} file(s) to ${result.targetPath}`);
			onSynced?.();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to sync skill";
			toast.error(message);
		} finally {
			syncing = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-xl">
		<DialogHeader>
			<DialogTitle>Sync "{skillName}"</DialogTitle>
			<DialogDescription>Compare the global copy and the project copy of this skill.</DialogDescription>
		</DialogHeader>

		{#if loading}
			<p class="text-muted-foreground py-4 text-sm">Loading…</p>
		{:else if error}
			<Alert variant="destructive">
				<AlertTitle>Could not load diff</AlertTitle>
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{:else if diff}
			{#if diff.status === "identical"}
				<Alert>
					<AlertTitle>Identical</AlertTitle>
					<AlertDescription>Both copies are identical. There is nothing to sync.</AlertDescription>
				</Alert>
			{:else if diff.status === "left-only"}
				<Alert>
					<AlertTitle>Global copy only</AlertTitle>
					<AlertDescription>No project copy exists yet.</AlertDescription>
				</Alert>
			{:else if diff.status === "right-only"}
				<Alert>
					<AlertTitle>Project copy only</AlertTitle>
					<AlertDescription>No global copy exists yet.</AlertDescription>
				</Alert>
			{/if}

			{#if diff.files.length > 0}
				<div class="max-h-64 overflow-y-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Path</TableHead>
								<TableHead>State</TableHead>
								<TableHead>Global mtime</TableHead>
								<TableHead>Project mtime</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each diff.files as file (file.path)}
								<TableRow>
									<TableCell class="font-mono text-xs">{file.path}</TableCell>
									<TableCell><FileStateBadge state={file.state} /></TableCell>
									<TableCell class="text-muted-foreground text-xs">{file.leftMtime ?? "—"}</TableCell>
									<TableCell class="text-muted-foreground text-xs">{file.rightMtime ?? "—"}</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Select.Root
					type="single"
					value={direction}
					onValueChange={(value) => {
						if (value) direction = value as Direction;
					}}
				>
					<Select.Trigger class="w-full" disabled={diff.status === "identical"}>
						{direction === "left-to-right"
							? "Overwrite project copy with global"
							: "Overwrite global copy with project"}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="left-to-right">Overwrite project copy with global</Select.Item>
						<Select.Item value="right-to-left">Overwrite global copy with project</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		{/if}

		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (open = false)} disabled={syncing}>
				Cancel
			</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={handleSync}
				disabled={syncing || loading || !diff || diff.status === "identical"}
			>
				{syncing ? "Syncing…" : "Sync"}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
