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
	import { toast } from "svelte-sonner";
	import StepSource from "./StepSource.svelte";
	import StepValidate from "./StepValidate.svelte";
	import StepTargets from "./StepTargets.svelte";
	import StepInstall from "./StepInstall.svelte";
	import { loadSkillImport, installSkillImport } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { getSelectedProjectId, invalidateResources } from "$lib/state/app-state.svelte";
	import { AGENT_IDS, type AgentId, type InstallTarget, type Scope, type SkillLoadResult, type SkillSource, type TargetResult } from "@weave/shared";

	let {
		open = $bindable(false),
		onInstalled,
	}: {
		open?: boolean;
		onInstalled?: () => void;
	} = $props();

	type Step = "source" | "validate" | "targets" | "install";

	let step = $state<Step>("source");

	// Source step fields
	let sourceKind = $state<SkillSource["kind"]>("localFolder");
	let localPath = $state("");
	let zipPath = $state("");
	let githubUrl = $state("");
	let githubRef = $state("");
	let githubSubpath = $state("");

	let validating = $state(false);
	let validateError = $state<string | null>(null);
	let loadResult = $state<SkillLoadResult | null>(null);

	function defaultTargets(): Record<AgentId, { enabled: boolean; scope: Scope }> {
		const record = {} as Record<AgentId, { enabled: boolean; scope: Scope }>;
		for (const agentId of AGENT_IDS) {
			record[agentId] = { enabled: false, scope: "global" };
		}
		return record;
	}

	let targets = $state(defaultTargets());

	let installing = $state(false);
	let installResults = $state<TargetResult[] | null>(null);

	const projectId = $derived(getSelectedProjectId());

	function reset() {
		step = "source";
		sourceKind = "localFolder";
		localPath = "";
		zipPath = "";
		githubUrl = "";
		githubRef = "";
		githubSubpath = "";
		validating = false;
		validateError = null;
		loadResult = null;
		targets = defaultTargets();
		installing = false;
		installResults = null;
	}

	$effect(() => {
		if (!open) reset();
	});

	function buildSource(): SkillSource | null {
		switch (sourceKind) {
			case "localFolder":
				return localPath.trim() ? { kind: "localFolder", path: localPath.trim() } : null;
			case "zip":
				return zipPath.trim() ? { kind: "zip", path: zipPath.trim() } : null;
			case "githubRepo":
				return githubUrl.trim()
					? { kind: "githubRepo", url: githubUrl.trim(), ref: githubRef.trim() || undefined }
					: null;
			case "githubSubfolder":
				return githubUrl.trim() && githubSubpath.trim()
					? {
							kind: "githubSubfolder",
							url: githubUrl.trim(),
							subpath: githubSubpath.trim(),
							ref: githubRef.trim() || undefined,
						}
					: null;
			default:
				return null;
		}
	}

	async function handleValidate() {
		const source = buildSource();
		if (!source) {
			toast.error("Fill in the required fields for this source type");
			return;
		}
		validating = true;
		validateError = null;
		try {
			loadResult = await loadSkillImport(source);
			step = "validate";
		} catch (err) {
			validateError = err instanceof ApiError ? err.message : "Failed to load skill";
		} finally {
			validating = false;
		}
	}

	function handleValidateNext() {
		step = "targets";
	}

	function buildInstallTargets(): InstallTarget[] {
		const result: InstallTarget[] = [];
		for (const agentId of AGENT_IDS) {
			const row = targets[agentId];
			if (!row.enabled) continue;
			if (row.scope === "project") {
				if (!projectId) continue;
				result.push({ agentId, scope: "project", projectId });
			} else {
				result.push({ agentId, scope: "global" });
			}
		}
		return result;
	}

	const hasSelectedTargets = $derived(buildInstallTargets().length > 0);

	async function handleInstall() {
		if (!loadResult) return;
		const installTargets = buildInstallTargets();
		if (installTargets.length === 0) {
			toast.error("Select at least one target");
			return;
		}
		step = "install";
		installing = true;
		installResults = null;
		try {
			const response = await installSkillImport(loadResult.stagingId, installTargets);
			installResults = response.results;
			invalidateResources();
			const failures = response.results.filter((r) => !r.ok);
			if (failures.length === 0) {
				toast.success("Skill installed");
			} else {
				toast.error(`${failures.length} target(s) failed to install`);
			}
			onInstalled?.();
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to install skill";
			toast.error(message);
			step = "targets";
		} finally {
			installing = false;
		}
	}

	function handleClose() {
		open = false;
	}

	function handleDone() {
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-xl">
		<DialogHeader>
			<DialogTitle>Import skill</DialogTitle>
			<DialogDescription>
				{#if step === "source"}
					Choose where to import the skill from.
				{:else if step === "validate"}
					Review the skill before installing it.
				{:else if step === "targets"}
					Choose which agents and scopes to install to.
				{:else}
					Installing the skill to the selected targets.
				{/if}
			</DialogDescription>
		</DialogHeader>

		{#if step === "source"}
			<StepSource
				bind:kind={sourceKind}
				bind:localPath
				bind:zipPath
				bind:githubUrl
				bind:githubRef
				bind:githubSubpath
			/>
			{#if validateError}
				<Alert variant="destructive">
					<AlertTitle>Could not load skill</AlertTitle>
					<AlertDescription>{validateError}</AlertDescription>
				</Alert>
			{/if}
		{:else if step === "validate" && loadResult}
			<StepValidate result={loadResult} />
		{:else if step === "targets"}
			<StepTargets bind:targets projectSelected={!!projectId} />
		{:else if step === "install"}
			<StepInstall {installing} results={installResults} />
		{/if}

		<DialogFooter>
			{#if step === "source"}
				<Button type="button" variant="outline" onclick={handleClose} disabled={validating}>
					Cancel
				</Button>
				<Button type="button" onclick={handleValidate} disabled={validating}>
					{validating ? "Loading…" : "Next"}
				</Button>
			{:else if step === "validate"}
				<Button type="button" variant="outline" onclick={() => (step = "source")}>Back</Button>
				<Button type="button" onclick={handleValidateNext} disabled={!loadResult?.installable}>
					Next
				</Button>
			{:else if step === "targets"}
				<Button type="button" variant="outline" onclick={() => (step = "validate")}>Back</Button>
				<Button type="button" onclick={handleInstall} disabled={!hasSelectedTargets}>Install</Button>
			{:else if step === "install"}
				<Button type="button" onclick={handleDone} disabled={installing}>Done</Button>
			{/if}
		</DialogFooter>
	</DialogContent>
</Dialog>
