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
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import { Progress } from "$lib/components/ui/progress";
	import { toast } from "svelte-sonner";
	import { installSkill } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { getSelectedProjectId, invalidateResources } from "$lib/state/app-state.svelte";
	import { AGENT_IDS, ADAPTER_FILE_RULES, type AgentId, type InstallTarget, type Scope, type SkillResource, type TargetResult } from "@weave/shared";

	let {
		open = $bindable(false),
		skill,
		onInstalled,
	}: {
		open?: boolean;
		skill: SkillResource | null;
		onInstalled?: () => void;
	} = $props();

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
	const skillName = $derived(skill?.skill.name ?? skill?.skill.dirName ?? "Skill");

	function isCurrentLocation(agentId: AgentId, scope: Scope): boolean {
		if (!skill) return false;
		if (skill.agentId !== agentId || skill.scope !== scope) return false;
		if (scope === "project") return skill.projectId === projectId;
		return true;
	}

	function scopeLabel(scope: Scope): string {
		return scope === "global" ? "Global" : "Project";
	}

	function reset() {
		targets = defaultTargets();
		installing = false;
		installResults = null;
	}

	$effect(() => {
		if (!open) reset();
	});

	function buildInstallTargets(): InstallTarget[] {
		const result: InstallTarget[] = [];
		for (const agentId of AGENT_IDS) {
			const row = targets[agentId];
			if (!row.enabled) continue;
			if (isCurrentLocation(agentId, row.scope)) continue;
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
		if (!skill) return;
		const installTargets = buildInstallTargets();
		if (installTargets.length === 0) {
			toast.error("Select at least one target");
			return;
		}
		installing = true;
		installResults = null;
		try {
			const response = await installSkill(skill.id, installTargets);
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
		} finally {
			installing = false;
		}
	}

	function handleClose() {
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-xl">
		<DialogHeader>
			<DialogTitle>Install "{skillName}"</DialogTitle>
			<DialogDescription>Choose which agents and scopes to install this skill to.</DialogDescription>
		</DialogHeader>

		{#if installing || installResults}
			<div class="flex flex-col gap-4">
				{#if installing}
					<div class="flex flex-col gap-2">
						<p class="text-muted-foreground text-sm">Installing…</p>
						<Progress value={null} />
					</div>
				{:else if installResults}
					{#each installResults as result, i (i)}
						<Alert variant={result.ok ? "default" : "destructive"}>
							<AlertTitle>
								{result.target.agentId} · {result.target.scope === "global" ? "Global" : "Project"}
							</AlertTitle>
							<AlertDescription>
								{#if result.ok}
									<p class="font-mono text-xs">{result.installedPath}</p>
								{:else}
									<p>{result.error}</p>
								{/if}
							</AlertDescription>
						</Alert>
					{/each}
				{/if}
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each AGENT_IDS as agentId (agentId)}
					{@const hasSkillRoots = ADAPTER_FILE_RULES[agentId].hasSkillRoots}
					{@const row = targets[agentId]}
					{@const alreadyInstalled = hasSkillRoots && isCurrentLocation(agentId, row.scope)}
					<div class="flex items-center justify-between gap-4 rounded-md border p-3">
						<div class="flex items-center gap-3">
							{#if !hasSkillRoots}
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="flex items-center gap-3 opacity-50">
											<Checkbox checked={false} disabled />
											<span class="font-medium">{agentId}</span>
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content>No verified skill location for this agent</Tooltip.Content>
								</Tooltip.Root>
							{:else if alreadyInstalled}
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="flex items-center gap-3 opacity-50">
											<Checkbox checked={false} disabled />
											<span class="font-medium">{agentId}</span>
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content>Already installed here</Tooltip.Content>
								</Tooltip.Root>
							{:else}
								<Checkbox
									id={`skill-install-target-${agentId}`}
									checked={row.enabled}
									onCheckedChange={(value) => {
										row.enabled = value === true;
									}}
								/>
								<Label for={`skill-install-target-${agentId}`} class="font-medium">{agentId}</Label>
							{/if}
						</div>

						{#if hasSkillRoots && !alreadyInstalled}
							<Select.Root
								type="single"
								value={row.scope}
								onValueChange={(value) => {
									if (value) row.scope = value as Scope;
								}}
							>
								<Select.Trigger class="w-32" disabled={!row.enabled}>
									{scopeLabel(row.scope)}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="global" disabled={isCurrentLocation(agentId, "global")}>
										Global
									</Select.Item>
									<Select.Item
										value="project"
										disabled={!projectId || isCurrentLocation(agentId, "project")}
									>
										Project
									</Select.Item>
								</Select.Content>
							</Select.Root>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<DialogFooter>
			{#if installResults}
				<Button type="button" onclick={handleClose}>Done</Button>
			{:else}
				<Button type="button" variant="outline" onclick={handleClose} disabled={installing}>
					Cancel
				</Button>
				<Button type="button" onclick={handleInstall} disabled={installing || !hasSelectedTargets}>
					{installing ? "Installing…" : "Install"}
				</Button>
			{/if}
		</DialogFooter>
	</DialogContent>
</Dialog>
