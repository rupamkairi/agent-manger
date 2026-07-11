<script lang="ts">
	import * as Sheet from "$lib/components/ui/sheet";
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { Button } from "$lib/components/ui/button";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import ScopeBadge from "$lib/components/shared/ScopeBadge.svelte";
	import ValidationBadge from "$lib/components/shared/ValidationBadge.svelte";
	import DeleteSkillAlert from "./DeleteSkillAlert.svelte";
	import SyncDiffDialog from "./SyncDiffDialog.svelte";
	import InstallSkillDialog from "./InstallSkillDialog.svelte";
	import { getSelectedProjectId } from "$lib/state/app-state.svelte";
	import type { SkillResource } from "@weave/shared";

	let {
		open = $bindable(false),
		skill,
		onChanged,
	}: {
		open: boolean;
		skill: SkillResource | null;
		onChanged?: () => void;
	} = $props();

	const title = $derived(skill?.skill.name ?? skill?.skill.dirName ?? "Skill");
	const hasProject = $derived(!!getSelectedProjectId());

	let syncOpen = $state(false);
	let deleteOpen = $state(false);
	let installOpen = $state(false);

	function handleDeleted() {
		open = false;
		onChanged?.();
	}

	function handleSynced() {
		onChanged?.();
	}

	function handleInstalled() {
		onChanged?.();
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-lg">
		{#if skill}
			<Sheet.Header>
				<Sheet.Title>{title}</Sheet.Title>
				{#if skill.skill.description}
					<Sheet.Description>{skill.skill.description}</Sheet.Description>
				{/if}
			</Sheet.Header>

			<div class="flex flex-col gap-4 px-4">
				<div class="flex flex-wrap items-center gap-2">
					<ScopeBadge scope={skill.scope} />
					<span class="text-muted-foreground text-sm">{skill.agentId}</span>
				</div>

				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p class="text-muted-foreground text-xs">Validation status</p>
						<ValidationBadge status={skill.skill.status} />
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Last modified</p>
						<p>{skill.mtime ?? "Unknown"}</p>
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<h3 class="text-sm font-medium">Path</h3>
					<p class="text-muted-foreground break-all font-mono text-xs">{skill.path}</p>
				</div>

				<div class="flex flex-col gap-1">
					<h3 class="text-sm font-medium">Files</h3>
					{#if skill.skill.files.length > 0}
						<ScrollArea class="h-48 rounded-md border">
							<ul class="p-3 font-mono text-xs">
								{#each skill.skill.files as file (file)}
									<li class="text-muted-foreground py-0.5">{file}</li>
								{/each}
							</ul>
						</ScrollArea>
					{:else}
						<p class="text-muted-foreground text-sm">No files recorded.</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<h3 class="text-sm font-medium">Validation issues</h3>
					{#if skill.skill.issues.length > 0}
						{#each skill.skill.issues as issue, i (i)}
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
					{:else}
						<p class="text-muted-foreground text-sm">No validation issues.</p>
					{/if}
				</div>
			</div>

			<Sheet.Footer class="flex-row justify-end gap-2">
				{#if hasProject}
					<Button variant="outline" onclick={() => (syncOpen = true)}>Sync…</Button>
				{:else}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button variant="outline" disabled>Sync…</Button>
						</Tooltip.Trigger>
						<Tooltip.Content>Select a project to sync this skill</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				<Button variant="outline" onclick={() => (installOpen = true)}>Install to…</Button>
				<Button variant="destructive" onclick={() => (deleteOpen = true)}>Delete this copy</Button>
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<DeleteSkillAlert bind:open={deleteOpen} {skill} onDeleted={handleDeleted} />
<SyncDiffDialog bind:open={syncOpen} {skill} onSynced={handleSynced} />
<InstallSkillDialog bind:open={installOpen} {skill} onInstalled={handleInstalled} />
