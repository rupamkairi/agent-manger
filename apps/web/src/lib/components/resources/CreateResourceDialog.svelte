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
	import * as Select from "$lib/components/ui/select";
	import ScopeBadge from "$lib/components/shared/ScopeBadge.svelte";
	import { createInstruction, createMemory } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { getSelectedProjectId, currentScope, invalidateResources } from "$lib/state/app-state.svelte";
	import { toast } from "svelte-sonner";
	import { ADAPTER_FILE_RULES, AGENT_IDS, type AgentId, type FilePutResponse } from "@weave/shared";

	let {
		open = $bindable(false),
		kind,
		onCreated,
	}: {
		open?: boolean;
		kind: "instruction" | "memory";
		onCreated?: (result: FilePutResponse) => void;
	} = $props();

	const scope = $derived(currentScope());
	const projectId = $derived(getSelectedProjectId() ?? undefined);

	// Instructions: fixed convention filenames the user picks from.
	// Memory: a base directory the user names a new file under.
	function optionsFor(agentId: AgentId): string[] {
		const rules = ADAPTER_FILE_RULES[agentId];
		const bucket = kind === "instruction" ? rules.instructionFiles : rules.memoryDirs;
		return scope === "global" ? bucket.global : bucket.project;
	}

	const availableAgents = $derived(AGENT_IDS.filter((agentId) => optionsFor(agentId).length > 0));

	let agentId = $state<AgentId | "">("");
	let selectedOption = $state<string>("");
	let memoryFileName = $state<string>("");
	let creating = $state(false);
	let error = $state<string | null>(null);

	const options = $derived(agentId ? optionsFor(agentId) : []);
	const memoryNameValid = $derived(
		kind !== "memory" || /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/.test(memoryFileName.trim()),
	);
	const targetPath = $derived(
		kind === "instruction"
			? selectedOption
			: selectedOption && memoryFileName.trim()
				? `${selectedOption}/${memoryFileName.trim()}`
				: "",
	);

	$effect(() => {
		if (open) {
			agentId = availableAgents[0] ?? "";
			selectedOption = "";
			memoryFileName = "";
			error = null;
		}
	});

	$effect(() => {
		if (agentId && options.length > 0 && !options.includes(selectedOption)) {
			selectedOption = options[0] ?? "";
		}
	});

	async function handleCreate() {
		if (!agentId || !targetPath) {
			error = "Choose an agent and file name.";
			return;
		}
		if (!memoryNameValid) {
			error = "File name must be a plain .md name (letters, digits, dots, dashes).";
			return;
		}
		error = null;
		creating = true;
		try {
			const body = { agentId, scope, projectId, path: targetPath, content: "" };
			const result = kind === "instruction" ? await createInstruction(body) : await createMemory(body);
			invalidateResources();
			toast.success("File created");
			onCreated?.(result);
			open = false;
		} catch (err) {
			error = err instanceof ApiError ? err.message : "Failed to create file";
		} finally {
			creating = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>New {kind === "instruction" ? "instruction" : "memory"} file</DialogTitle>
			<DialogDescription>Create a new file for the current scope.</DialogDescription>
		</DialogHeader>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label>Scope</Label>
				<div>
					<ScopeBadge {scope} />
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="create-resource-agent">Agent</Label>
				<Select.Root type="single" bind:value={agentId}>
					<Select.Trigger id="create-resource-agent">
						{agentId || "Select an agent"}
					</Select.Trigger>
					<Select.Content>
						{#each availableAgents as option (option)}
							<Select.Item value={option}>{option}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if availableAgents.length === 0}
					<p class="text-muted-foreground text-xs">
						No agent supports {kind} files for this scope.
					</p>
				{/if}
			</div>

			{#if kind === "instruction"}
				<div class="flex flex-col gap-2">
					<Label for="create-resource-filename">File name</Label>
					<Select.Root type="single" bind:value={selectedOption}>
						<Select.Trigger id="create-resource-filename">
							{selectedOption || "Select a file name"}
						</Select.Trigger>
						<Select.Content>
							{#each options as option (option)}
								<Select.Item value={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{:else}
				{#if options.length > 1}
					<div class="flex flex-col gap-2">
						<Label for="create-resource-dir">Directory</Label>
						<Select.Root type="single" bind:value={selectedOption}>
							<Select.Trigger id="create-resource-dir">
								{selectedOption || "Select a directory"}
							</Select.Trigger>
							<Select.Content>
								{#each options as option (option)}
									<Select.Item value={option}>{option}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				<div class="flex flex-col gap-2">
					<Label for="create-resource-memory-name">File name</Label>
					<Input
						id="create-resource-memory-name"
						bind:value={memoryFileName}
						placeholder="notes.md"
						autocomplete="off"
					/>
					{#if selectedOption}
						<p class="text-muted-foreground text-xs font-mono">
							{selectedOption}/{memoryFileName.trim() || "…"}
						</p>
					{/if}
					{#if memoryFileName.trim() && !memoryNameValid}
						<p class="text-destructive text-xs">
							Use a plain .md file name — letters, digits, dots, dashes; no slashes.
						</p>
					{/if}
				</div>
			{/if}

			{#if error}
				<p class="text-destructive text-sm">{error}</p>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)} disabled={creating}>Cancel</Button>
			<Button
				onclick={handleCreate}
				disabled={creating || !agentId || !targetPath || !memoryNameValid}
			>
				{creating ? "Creating…" : "Create"}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
