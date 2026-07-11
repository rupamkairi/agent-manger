<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { getWorkflow } from "$lib/api/endpoints";
	import { ScheduleWriteSchema, type Schedule, type ScheduleWrite, type WorkflowDefinition, type WorkflowSummary } from "@weave/shared";

	let { open = $bindable(false), schedule = null, workflows, saving = false, onSave }: { open?: boolean; schedule?: Schedule | null; workflows: WorkflowSummary[]; saving?: boolean; onSave: (value: ScheduleWrite) => void | Promise<void> } = $props();
	let workflowId = $state("");
	let kind = $state<"once" | "interval" | "cron">("cron");
	let onceAt = $state("");
	let intervalMinutes = $state(60);
	let cronExpr = $state("0 9 * * 1-5");
	let timezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
	let enabled = $state(true);
	let missedRunPolicy = $state<"skip" | "runOnce">("skip");
	let inputs = $state<Record<string, string>>({});
	let definition = $state<WorkflowDefinition | null>(null);
	let error = $state<string | null>(null);

	function localDateTime(iso: string): string {
		const date = new Date(iso);
		const offset = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - offset).toISOString().slice(0, 16);
	}

	$effect(() => {
		if (!open) return;
		workflowId = schedule?.workflowId ?? workflows[0]?.id ?? "";
		kind = schedule?.spec.kind ?? "cron";
		onceAt = schedule?.spec.kind === "once" ? localDateTime(schedule.spec.at) : "";
		intervalMinutes = schedule?.spec.kind === "interval" ? schedule.spec.everyMs / 60_000 : 60;
		cronExpr = schedule?.spec.kind === "cron" ? schedule.spec.expr : "0 9 * * 1-5";
		timezone = schedule?.spec.kind === "cron" ? (schedule.spec.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone) : Intl.DateTimeFormat().resolvedOptions().timeZone;
		enabled = schedule?.enabled ?? true;
		missedRunPolicy = schedule?.missedRunPolicy ?? "skip";
		inputs = Object.fromEntries(Object.entries(schedule?.inputs ?? {}).map(([key, value]) => [key, String(value ?? "")]));
		error = null;
	});

	$effect(() => {
		if (!open || !workflowId) return;
		let active = true;
		void getWorkflow(workflowId).then((result) => {
			if (!active) return;
			definition = result;
			inputs = Object.fromEntries(result.inputs.map((input) => [input.key, inputs[input.key] ?? (input.default === undefined ? "" : String(input.default))]));
		}).catch(() => { if (active) definition = null; });
		return () => { active = false; };
	});

	async function submit() {
		const spec = kind === "once"
			? { kind, at: onceAt ? new Date(onceAt).toISOString() : "" }
			: kind === "interval"
				? { kind, everyMs: Number(intervalMinutes) * 60_000 }
				: { kind, expr: cronExpr, tz: timezone || undefined };
		const parsed = ScheduleWriteSchema.safeParse({ workflowId, spec, enabled, inputs, missedRunPolicy });
		if (!parsed.success) { error = parsed.error.issues[0]?.message ?? "Review the schedule fields."; return; }
		await onSave(parsed.data);
	}
</script>

<Dialog.Root bind:open><Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-xl"><Dialog.Header><Dialog.Title>{schedule ? "Edit schedule" : "New schedule"}</Dialog.Title><Dialog.Description>Choose when this workflow should run and which inputs it receives.</Dialog.Description></Dialog.Header>
	<div class="flex flex-col gap-5 py-2">
		<div class="flex flex-col gap-2"><Label>Workflow</Label><Select.Root type="single" value={workflowId} onValueChange={(value) => (workflowId = value)}><Select.Trigger class="w-full">{workflows.find((workflow) => workflow.id === workflowId)?.name ?? "Select workflow"}</Select.Trigger><Select.Content>{#each workflows as workflow (workflow.id)}<Select.Item value={workflow.id}>{workflow.name}</Select.Item>{/each}</Select.Content></Select.Root></div>
		<div class="flex flex-col gap-2"><Label>Schedule type</Label><Select.Root type="single" value={kind} onValueChange={(value) => (kind = value as typeof kind)}><Select.Trigger class="w-full">{kind === "cron" ? "Cron expression" : kind === "interval" ? "Interval" : "Run once"}</Select.Trigger><Select.Content><Select.Item value="cron">Cron expression</Select.Item><Select.Item value="interval">Interval</Select.Item><Select.Item value="once">Run once</Select.Item></Select.Content></Select.Root></div>
		{#if kind === "once"}<div class="flex flex-col gap-2"><Label for="schedule-once">Run at</Label><Input id="schedule-once" type="datetime-local" bind:value={onceAt} /></div>
		{:else if kind === "interval"}<div class="flex flex-col gap-2"><Label for="schedule-interval">Every (minutes)</Label><Input id="schedule-interval" type="number" min="1" bind:value={intervalMinutes} /></div>
		{:else}<div class="grid gap-4 sm:grid-cols-2"><div class="flex flex-col gap-2"><Label for="schedule-cron">Cron expression</Label><Input id="schedule-cron" bind:value={cronExpr} class="font-mono" /></div><div class="flex flex-col gap-2"><Label for="schedule-timezone">Timezone</Label><Input id="schedule-timezone" bind:value={timezone} placeholder="UTC" /></div></div>{/if}
		{#if definition?.inputs.length}<div class="grid gap-4 sm:grid-cols-2">{#each definition.inputs as input (input.key)}<div class="flex flex-col gap-2"><Label for={`schedule-${input.key}`}>{input.label}{input.required ? " *" : ""}</Label><Input id={`schedule-${input.key}`} value={inputs[input.key] ?? ""} oninput={(event) => (inputs = { ...inputs, [input.key]: event.currentTarget.value })} /></div>{/each}</div>{/if}
		<div class="flex flex-col gap-2"><Label>Missed run policy</Label><Select.Root type="single" value={missedRunPolicy} onValueChange={(value) => (missedRunPolicy = value as typeof missedRunPolicy)}><Select.Trigger class="w-full">{missedRunPolicy === "runOnce" ? "Run once after restart" : "Skip missed run"}</Select.Trigger><Select.Content><Select.Item value="skip">Skip missed run</Select.Item><Select.Item value="runOnce">Run once after restart</Select.Item></Select.Content></Select.Root></div>
		<label class="flex items-center gap-2 text-sm"><Checkbox checked={enabled} onCheckedChange={(checked) => (enabled = checked === true)} />Enable this schedule immediately</label>
		{#if error}<Alert variant="destructive"><AlertTitle>Schedule is not valid</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>{/if}
	</div>
	<Dialog.Footer><Button variant="outline" onclick={() => (open = false)}>Cancel</Button><Button onclick={submit} disabled={saving || !workflowId}>{saving ? "Saving…" : "Save schedule"}</Button></Dialog.Footer>
</Dialog.Content></Dialog.Root>
