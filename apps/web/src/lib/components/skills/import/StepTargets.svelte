<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Select from "$lib/components/ui/select";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { Label } from "$lib/components/ui/label";
	import { AGENT_IDS, ADAPTER_FILE_RULES, type AgentId, type Scope } from "@weave/shared";

	let {
		targets = $bindable(),
		projectSelected,
	}: {
		targets: Record<AgentId, { enabled: boolean; scope: Scope }>;
		projectSelected: boolean;
	} = $props();

	function scopeLabel(scope: Scope): string {
		return scope === "global" ? "Global" : "Project";
	}
</script>

<div class="flex flex-col gap-3">
	{#each AGENT_IDS as agentId (agentId)}
		{@const hasSkillRoots = ADAPTER_FILE_RULES[agentId].hasSkillRoots}
		{@const row = targets[agentId]}
		<div class="flex items-center justify-between gap-4 rounded-md border p-3">
			<div class="flex items-center gap-3">
				{#if hasSkillRoots}
					<Checkbox
						id={`skill-import-target-${agentId}`}
						checked={row.enabled}
						onCheckedChange={(value) => {
							row.enabled = value === true;
						}}
					/>
					<Label for={`skill-import-target-${agentId}`} class="font-medium">{agentId}</Label>
				{:else}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="flex items-center gap-3 opacity-50">
								<Checkbox checked={false} disabled />
								<span class="font-medium">{agentId}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>No verified skill location for this agent</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>

			{#if hasSkillRoots}
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
						<Select.Item value="global">Global</Select.Item>
						<Select.Item value="project" disabled={!projectSelected}>Project</Select.Item>
					</Select.Content>
				</Select.Root>
			{/if}
		</div>
	{/each}
</div>
