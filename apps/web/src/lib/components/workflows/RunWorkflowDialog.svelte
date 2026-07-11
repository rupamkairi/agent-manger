<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
	import { checkWorkflow, getWorkflow, runWorkflow } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { navigate } from "$lib/router.svelte";
	import { DependencyCheckResultSchema, type DependencyCheckResult, type WorkflowDefinition } from "@weave/shared";
	import PlayIcon from "@lucide/svelte/icons/play";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";

	let { open = $bindable(false), workflowId }: { open?: boolean; workflowId: string | null } = $props();
	let workflow = $state<WorkflowDefinition | null>(null);
	let inputs = $state<Record<string, string>>({});
	let check = $state<DependencyCheckResult | null>(null);
	let loading = $state(false);
	let running = $state(false);
	let error = $state<string | null>(null);
	const requiredInputsPresent = $derived(
		workflow?.inputs.every((input) => !input.required || String(inputs[input.key] ?? "").trim().length > 0) ?? false,
	);

	$effect(() => {
		const id = workflowId;
		if (!open || !id) return;
		let active = true;
		loading = true;
		error = null;
		check = null;
		void getWorkflow(id)
			.then((result) => {
				if (!active) return;
				workflow = result;
				inputs = Object.fromEntries(result.inputs.map((input) => [input.key, input.default === undefined ? "" : String(input.default)]));
				return checkWorkflow(id, inputs);
			})
			.then((result) => { if (active && result) check = result; })
			.catch((err) => { if (active) error = err instanceof ApiError ? err.message : "Could not check this workflow"; })
			.finally(() => { if (active) loading = false; });
		return () => { active = false; };
	});

	async function refreshCheck() {
		if (!workflowId) return;
		loading = true;
		error = null;
		try { check = await checkWorkflow(workflowId, inputs); }
		catch (err) { error = err instanceof ApiError ? err.message : "Dependency check failed"; }
		finally { loading = false; }
	}

	async function run() {
		if (!workflowId || !check?.ok) return;
		running = true;
		error = null;
		try {
			const result = await runWorkflow(workflowId, { inputs });
			open = false;
			navigate(`/jobs/${encodeURIComponent(result.jobId)}`);
		} catch (err) {
			if (err instanceof ApiError && err.code === "conflict") {
				const latestCheck = DependencyCheckResultSchema.safeParse(err.details);
				if (latestCheck.success) check = latestCheck.data;
			}
			error = err instanceof ApiError ? err.message : "Could not start workflow";
		} finally { running = false; }
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Run {workflow?.name ?? "workflow"}</Dialog.Title>
			<Dialog.Description>Confirm runtime inputs and resolve every dependency before starting.</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-5 py-2">
			{#if workflow?.inputs.length}
				<div class="grid gap-4 sm:grid-cols-2">
					{#each workflow.inputs as input (input.key)}
						<div class="flex flex-col gap-2">
							<Label for={`run-${input.key}`}>{input.label}{input.required ? " *" : ""}</Label>
							<Input id={`run-${input.key}`} value={inputs[input.key] ?? ""} oninput={(event) => { inputs = { ...inputs, [input.key]: event.currentTarget.value }; check = null; }} />
						</div>
					{/each}
				</div>
			{/if}

			<div class="flex items-center justify-between gap-3">
				<div><h3 class="text-sm font-medium">Dependency check</h3><p class="text-muted-foreground text-xs">Agents and resources are checked against Weave’s index.</p></div>
				<Button variant="outline" size="sm" onclick={refreshCheck} disabled={loading}>{loading ? "Checking…" : check ? "Check again" : "Check dependencies"}</Button>
			</div>

			{#if loading}
				<div class="text-muted-foreground flex items-center gap-2 rounded-lg border p-4 text-sm"><LoaderCircleIcon class="size-4 animate-spin" />Checking dependencies…</div>
			{:else if check}
				<div class="overflow-hidden rounded-lg border">
					<Table>
						<TableHeader><TableRow><TableHead>Step</TableHead><TableHead>Dependency</TableHead><TableHead>Expected location</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
						<TableBody>
							{#each check.items as item (`${item.stepId}-${item.kind}-${item.name}`)}
								<TableRow><TableCell>{item.stepId}</TableCell><TableCell><span class="font-medium">{item.name}</span><span class="text-muted-foreground ml-1 text-xs">{item.kind}</span></TableCell><TableCell class="max-w-56 truncate font-mono text-xs" title={item.foundAt ?? item.expectedLocation}>{item.foundAt ?? item.expectedLocation}</TableCell><TableCell><Badge variant={item.status === "found" ? "secondary" : "destructive"}>{item.status === "found" ? "Ready" : "Missing"}</Badge></TableCell></TableRow>
							{/each}
						</TableBody>
					</Table>
					{#if check.items.length === 0}<p class="text-muted-foreground p-4 text-sm">No external dependencies are required.</p>{/if}
				</div>
			{/if}

			{#if error}<Alert variant="destructive"><AlertTitle>Unable to run</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={run} disabled={!check?.ok || !requiredInputsPresent || running || loading}><PlayIcon class="size-4" />{running ? "Starting…" : "Run workflow"}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
