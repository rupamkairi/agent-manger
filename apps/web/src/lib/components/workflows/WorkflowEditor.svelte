<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import WorkflowDagPreview from "./WorkflowDagPreview.svelte";
	import { AGENT_IDS, WorkflowDefinitionSchema, type AgentId, type WorkflowDefinition, type WorkflowInput, type WorkflowStep } from "@weave/shared";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import SaveIcon from "@lucide/svelte/icons/save";

	let {
		initial,
		saving = false,
		onSave,
		onCancel,
	}: {
		initial?: WorkflowDefinition;
		saving?: boolean;
		onSave: (workflow: WorkflowDefinition) => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	function newStep(index: number): WorkflowStep {
		return {
			id: `step-${index + 1}`,
			name: `Step ${index + 1}`,
			agentId: AGENT_IDS[0]!,
			requiredSkills: [],
			requiredInstructions: [],
			requiredConfigs: [],
			after: [],
			prompt: "",
			inputBindings: {},
			outputCapture: "stdout",
			retry: { maxAttempts: 1, backoffMs: 5000, backoffMultiplier: 2 },
			continueOnFailure: false,
		};
	}

	function getInitialDefinition() {
		return initial;
	}
	const seed = getInitialDefinition();
	let id = $state(seed?.id ?? "");
	let name = $state(seed?.name ?? "");
	let description = $state(seed?.description ?? "");
	let projectPath = $state(seed?.projectPath ?? "");
	let version = $state(seed?.version ?? 1);
	let defaultTimeoutMs = $state(seed?.defaultTimeoutMs ?? 600_000);
	let failurePolicy = $state<WorkflowDefinition["failurePolicy"]>(seed?.failurePolicy ?? "stopOnFirstFailure");
	let inputs = $state<WorkflowInput[]>(seed?.inputs ? structuredClone(seed.inputs) : []);
	let steps = $state<WorkflowStep[]>(seed?.steps ? structuredClone(seed.steps) : [newStep(0)]);
	let outputs = $state<Record<string, string>>(seed?.outputs ? structuredClone(seed.outputs) : {});
	let error = $state<string | null>(null);

	function slugify(value: string): string {
		return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
	}

	function addInput() {
		inputs = [...inputs, { key: `input-${inputs.length + 1}`, label: `Input ${inputs.length + 1}`, required: false }];
	}

	function updateInput(index: number, patch: Partial<WorkflowInput>) {
		inputs = inputs.map((input, i) => (i === index ? { ...input, ...patch } : input));
	}

	function addStep() {
		let candidate = newStep(steps.length);
		let suffix = steps.length + 1;
		while (steps.some((step) => step.id === candidate.id)) candidate = { ...candidate, id: `step-${++suffix}` };
		steps = [...steps, candidate];
	}

	function updateStep(index: number, patch: Partial<WorkflowStep>) {
		steps = steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
	}

	function removeStep(index: number) {
		const removed = steps[index]?.id;
		steps = steps.filter((_, i) => i !== index).map((step) => ({ ...step, after: step.after.filter((id) => id !== removed) }));
	}

	function toggleAfter(index: number, dependencyId: string, checked: boolean) {
		const current = steps[index]!.after;
		updateStep(index, { after: checked ? [...new Set([...current, dependencyId])] : current.filter((id) => id !== dependencyId) });
	}

	function commaList(value: string): string[] {
		return value.split(",").map((item) => item.trim()).filter(Boolean);
	}

	function mappingsText(value: Record<string, string>): string {
		return Object.entries(value).map(([key, expression]) => `${key} = ${expression}`).join("\n");
	}

	function parseMappings(value: string): Record<string, string> {
		return Object.fromEntries(
			value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
				const separator = line.indexOf("=");
				return separator < 1
					? [line, line]
					: [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
			}),
		);
	}

	async function submit() {
		error = null;
		const parsed = WorkflowDefinitionSchema.safeParse({
			id: id || slugify(name), name, description, version: Number(version), projectPath, inputs, steps,
			outputs, failurePolicy, defaultTimeoutMs: Number(defaultTimeoutMs),
		});
		if (!parsed.success) {
			error = parsed.error.issues[0]?.message ?? "Review the workflow fields.";
			return;
		}
		await onSave(parsed.data);
	}
</script>

<div class="flex flex-col gap-6">
	<Card>
		<CardHeader>
			<CardTitle>Workflow details</CardTitle>
			<CardDescription>Name the workflow and choose the project directory used by every step.</CardDescription>
		</CardHeader>
		<CardContent class="grid gap-5 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="workflow-name">Name</Label>
				<Input id="workflow-name" bind:value={name} onblur={() => { if (!initial && !id) id = slugify(name); }} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="workflow-id">ID</Label>
				<Input id="workflow-id" bind:value={id} disabled={Boolean(initial)} placeholder="release-review" />
			</div>
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for="workflow-description">Description</Label>
				<Textarea id="workflow-description" bind:value={description} rows={3} />
			</div>
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for="workflow-path">Project path</Label>
				<Input id="workflow-path" bind:value={projectPath} class="font-mono" placeholder="/absolute/path/to/project" />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="workflow-timeout">Default timeout (ms)</Label>
				<Input id="workflow-timeout" type="number" min="1" bind:value={defaultTimeoutMs} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="workflow-version">Version</Label>
				<Input id="workflow-version" type="number" min="1" step="1" bind:value={version} />
			</div>
			<div class="flex flex-col gap-2">
				<Label>Failure policy</Label>
				<Select.Root type="single" value={failurePolicy} onValueChange={(value) => (failurePolicy = value as WorkflowDefinition["failurePolicy"])}>
					<Select.Trigger class="w-full">{failurePolicy === "stopOnFirstFailure" ? "Stop on first failure" : "Run independent branches"}</Select.Trigger>
					<Select.Content>
						<Select.Item value="stopOnFirstFailure">Stop on first failure</Select.Item>
						<Select.Item value="runIndependentBranches">Run independent branches</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader class="flex-row items-start justify-between">
			<div><CardTitle>Inputs</CardTitle><CardDescription>Values requested whenever this workflow runs.</CardDescription></div>
			<Button variant="outline" size="sm" onclick={addInput}><PlusIcon class="size-4" />Add input</Button>
		</CardHeader>
		<CardContent class="flex flex-col gap-3">
			{#if inputs.length === 0}<p class="text-muted-foreground text-sm">This workflow does not require runtime inputs.</p>{/if}
			{#each inputs as input, index (index)}
				<div class="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
					<div class="flex flex-col gap-1.5"><Label>Key</Label><Input value={input.key} oninput={(event) => updateInput(index, { key: event.currentTarget.value })} /></div>
					<div class="flex flex-col gap-1.5"><Label>Label</Label><Input value={input.label} oninput={(event) => updateInput(index, { label: event.currentTarget.value })} /></div>
					<div class="flex flex-col gap-1.5"><Label>Default</Label><Input value={typeof input.default === "string" ? input.default : ""} oninput={(event) => updateInput(index, { default: event.currentTarget.value || undefined })} /></div>
					<label class="flex h-8 items-center gap-2 text-sm"><Checkbox checked={input.required} onCheckedChange={(checked) => updateInput(index, { required: checked === true })} />Required</label>
					<Button variant="ghost" size="icon" aria-label="Remove input" onclick={() => (inputs = inputs.filter((_, i) => i !== index))}><Trash2Icon class="size-4" /></Button>
				</div>
			{/each}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Workflow outputs</CardTitle>
			<CardDescription>Expose named values from workflow inputs or successful step output.</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-2">
			<Label for="workflow-outputs">Output bindings</Label>
			<Textarea
				id="workflow-outputs"
				rows={3}
				value={mappingsText(outputs)}
				oninput={(event) => (outputs = parseMappings(event.currentTarget.value))}
				placeholder="summary = steps.review.output"
			/>
			<p class="text-muted-foreground text-xs">One line per binding: <code>name = inputs.key</code> or <code>name = steps.step-id.output</code>.</p>
		</CardContent>
	</Card>

	<section class="flex flex-col gap-3">
		<div class="flex items-end justify-between gap-3">
			<div><h2 class="section-heading">Steps</h2><p class="text-muted-foreground mt-1 text-sm">Ready steps run in parallel after their dependencies complete.</p></div>
			<Button variant="outline" size="sm" onclick={addStep}><PlusIcon class="size-4" />Add step</Button>
		</div>
		{#each steps as step, index (step.id + index)}
			<Card>
				<CardHeader class="flex-row items-start justify-between">
					<div><CardTitle>Step {index + 1}</CardTitle><CardDescription class="font-mono">{step.id}</CardDescription></div>
					<Button variant="ghost" size="icon" aria-label="Remove step" disabled={steps.length === 1} onclick={() => removeStep(index)}><Trash2Icon class="size-4" /></Button>
				</CardHeader>
				<CardContent class="grid gap-5 sm:grid-cols-2">
					<div class="flex flex-col gap-2"><Label>Step ID</Label><Input value={step.id} oninput={(event) => updateStep(index, { id: slugify(event.currentTarget.value) })} /></div>
					<div class="flex flex-col gap-2"><Label>Name</Label><Input value={step.name} oninput={(event) => updateStep(index, { name: event.currentTarget.value })} /></div>
					<div class="flex flex-col gap-2">
						<Label>Agent</Label>
						<Select.Root type="single" value={step.agentId} onValueChange={(value) => updateStep(index, { agentId: value as AgentId })}>
							<Select.Trigger class="w-full">{step.agentId}</Select.Trigger>
							<Select.Content>{#each AGENT_IDS as agentId (agentId)}<Select.Item value={agentId}>{agentId}</Select.Item>{/each}</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2"><Label>Timeout (ms, optional)</Label><Input type="number" min="1" value={step.timeoutMs ?? ""} oninput={(event) => updateStep(index, { timeoutMs: event.currentTarget.value ? Number(event.currentTarget.value) : undefined })} /></div>
					<div class="flex flex-col gap-2">
						<Label>Output capture</Label>
						<Select.Root type="single" value={step.outputCapture} onValueChange={(value) => updateStep(index, { outputCapture: value as WorkflowStep["outputCapture"] })}>
							<Select.Trigger class="w-full">{step.outputCapture === "lastLine" ? "Last line" : step.outputCapture === "jsonBlock" ? "JSON block" : "Full stdout"}</Select.Trigger>
							<Select.Content><Select.Item value="stdout">Full stdout</Select.Item><Select.Item value="lastLine">Last line</Select.Item><Select.Item value="jsonBlock">JSON block</Select.Item></Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2 sm:col-span-2"><Label>Prompt</Label><Textarea rows={5} value={step.prompt} oninput={(event) => updateStep(index, { prompt: event.currentTarget.value })} placeholder={"Use {{inputs.key}} to reference runtime inputs."} /></div>
					<div class="flex flex-col gap-2 sm:col-span-2">
						<Label>Input bindings</Label>
						<Textarea rows={3} value={mappingsText(step.inputBindings)} oninput={(event) => updateStep(index, { inputBindings: parseMappings(event.currentTarget.value) })} placeholder="source = inputs.repository" />
						<p class="text-muted-foreground text-xs">One binding per line. Bound values are merged into this step's inputs.</p>
					</div>
					<div class="flex flex-col gap-2 sm:col-span-2">
						<Label>Run after</Label>
						<div class="flex min-h-9 flex-wrap gap-2 rounded-lg border p-2">
							{#each steps.filter((_, i) => i !== index) as option (option.id)}
								<label class="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs"><Checkbox checked={step.after.includes(option.id)} onCheckedChange={(checked) => toggleAfter(index, option.id, checked === true)} />{option.name || option.id}</label>
							{/each}
							{#if steps.length === 1}<span class="text-muted-foreground text-xs">No other steps available.</span>{/if}
						</div>
					</div>
					<div class="flex flex-col gap-2"><Label>Required skills</Label><Input value={step.requiredSkills.join(", ")} oninput={(event) => updateStep(index, { requiredSkills: commaList(event.currentTarget.value) })} placeholder="review, testing" /></div>
					<div class="flex flex-col gap-2"><Label>Required instructions</Label><Input value={step.requiredInstructions.join(", ")} oninput={(event) => updateStep(index, { requiredInstructions: commaList(event.currentTarget.value) })} /></div>
					<div class="flex flex-col gap-2"><Label>Required configs</Label><Input value={step.requiredConfigs.join(", ")} oninput={(event) => updateStep(index, { requiredConfigs: commaList(event.currentTarget.value) })} /></div>
					<div class="grid grid-cols-3 gap-2">
						<div class="flex flex-col gap-2"><Label>Attempts</Label><Input type="number" min="1" max="10" value={step.retry.maxAttempts} oninput={(event) => updateStep(index, { retry: { ...step.retry, maxAttempts: Number(event.currentTarget.value) } })} /></div>
						<div class="flex flex-col gap-2"><Label>Backoff ms</Label><Input type="number" min="0" value={step.retry.backoffMs} oninput={(event) => updateStep(index, { retry: { ...step.retry, backoffMs: Number(event.currentTarget.value) } })} /></div>
						<div class="flex flex-col gap-2"><Label>Multiplier</Label><Input type="number" min="1" step="0.1" value={step.retry.backoffMultiplier} oninput={(event) => updateStep(index, { retry: { ...step.retry, backoffMultiplier: Number(event.currentTarget.value) } })} /></div>
					</div>
					<label class="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={step.continueOnFailure} onCheckedChange={(checked) => updateStep(index, { continueOnFailure: checked === true })} />Allow dependent branches to continue if this step fails</label>
				</CardContent>
			</Card>
		{/each}
	</section>

	<section class="flex flex-col gap-3"><h2 class="section-heading">Dependency graph</h2><WorkflowDagPreview {steps} /></section>

	{#if error}<Alert variant="destructive"><AlertTitle>Workflow is not valid</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>{/if}
	<div class="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur-sm">
		<Button variant="outline" onclick={onCancel} disabled={saving}>Cancel</Button>
		<Button onclick={submit} disabled={saving}><SaveIcon class="size-4" />{saving ? "Saving…" : "Save workflow"}</Button>
	</div>
</div>
