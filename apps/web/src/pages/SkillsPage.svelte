<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import ScopeBadge from "$lib/components/shared/ScopeBadge.svelte";
	import ValidationBadge from "$lib/components/shared/ValidationBadge.svelte";
	import SkillDetailSheet from "$lib/components/skills/SkillDetailSheet.svelte";
	import SkillImportWizard from "$lib/components/skills/import/SkillImportWizard.svelte";
	import { Button } from "$lib/components/ui/button";
	import { TableHead, TableRow, TableCell } from "$lib/components/ui/table";
	import * as Select from "$lib/components/ui/select";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { createQuery } from "$lib/state/query.svelte";
	import {
		getResourceVersion,
		getSelectedProjectId,
		invalidateResources,
		scopeQueryParams,
	} from "$lib/state/app-state.svelte";
	import { listSkills } from "$lib/api/endpoints";
	import type { SkillResource, SkillStatus } from "@weave/shared";

	const STATUS_OPTIONS: { value: SkillStatus; label: string }[] = [
		{ value: "valid", label: "Valid" },
		{ value: "warning", label: "Warning" },
		{ value: "invalid", label: "Invalid" },
		{ value: "unknown", label: "Unknown" },
	];

	let statusFilter = $state<SkillStatus | undefined>(undefined);

	const skillsQuery = createQuery(() => listSkills(scopeQueryParams()));

	// Re-run the query whenever the selected project changes or resources are invalidated.
	$effect(() => {
		getSelectedProjectId();
		getResourceVersion();
		skillsQuery.refresh();
	});

	let importOpen = $state(false);

	function handleImported() {
		invalidateResources();
		skillsQuery.refresh();
	}

	function handleSkillChanged() {
		invalidateResources();
		skillsQuery.refresh();
	}

	const filteredSkills = $derived.by(() => {
		const skills = skillsQuery.data ?? [];
		if (!statusFilter) return skills;
		return skills.filter((s) => s.skill.status === statusFilter);
	});
	const emptyDescription = $derived(
		getSelectedProjectId()
			? "Rescan the selected project to discover skills here."
			: "Run a global scan from the Dashboard to discover skills here.",
	);

	let selectedSkill = $state<SkillResource | null>(null);
	let detailOpen = $state(false);

	function openSkill(skill: SkillResource) {
		selectedSkill = skill;
		detailOpen = true;
	}

	function truncatePath(path: string, max = 40): string {
		if (path.length <= max) return path;
		return `…${path.slice(path.length - max + 1)}`;
	}

	function truncateDescription(description: string | null, max = 72): string {
		if (!description) return "—";
		return description.length <= max ? description : `${description.slice(0, max - 1)}…`;
	}

	function relativeTime(iso: string | null): string {
		if (!iso) return "Never";
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return "Unknown";
		const diffMs = Date.now() - date.getTime();
		const diffSec = Math.round(diffMs / 1000);
		const units: [Intl.RelativeTimeFormatUnit, number][] = [
			["year", 60 * 60 * 24 * 365],
			["month", 60 * 60 * 24 * 30],
			["day", 60 * 60 * 24],
			["hour", 60 * 60],
			["minute", 60],
		];
		const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
		for (const [unit, secondsInUnit] of units) {
			if (Math.abs(diffSec) >= secondsInUnit) {
				return rtf.format(-Math.round(diffSec / secondsInUnit), unit);
			}
		}
		return rtf.format(-diffSec, "second");
	}
</script>

<div class="page-stack">
	<PageHeader title="Skills" description="Skills discovered across agents.">
		{#snippet actions()}
			<Button onclick={() => (importOpen = true)}>Import skill</Button>
		{/snippet}
	</PageHeader>

	<div class="flex items-center gap-3">
		<Select.Root
			type="single"
			value={statusFilter ?? ""}
			onValueChange={(value) => {
				statusFilter = (value || undefined) as SkillStatus | undefined;
			}}
		>
			<Select.Trigger class="w-48">
				{statusFilter
					? (STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "All statuses")
					: "All statuses"}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">All statuses</Select.Item>
				{#each STATUS_OPTIONS as option (option.value)}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if skillsQuery.error}
		<ErrorState message={skillsQuery.error} onRetry={skillsQuery.refresh} />
	{:else}
		<DataTable
			items={filteredSkills}
			loading={skillsQuery.loading}
				columns={7}
				emptyTitle="No skills found"
				emptyDescription={emptyDescription}
			>
				{#snippet header()}
					<TableHead>Name</TableHead>
					<TableHead>Description</TableHead>
					<TableHead>Scope</TableHead>
				<TableHead>Agent</TableHead>
				<TableHead>Validation</TableHead>
				<TableHead>Path</TableHead>
				<TableHead>Modified</TableHead>
			{/snippet}
				{#snippet row(skill: SkillResource)}
					<TableRow
						class="cursor-pointer"
						role="button"
						tabindex={0}
						onclick={() => openSkill(skill)}
						onkeydown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								openSkill(skill);
							}
						}}
					>
						<TableCell class="font-medium">{skill.skill.name ?? skill.skill.dirName}</TableCell>
						<TableCell class="max-w-xs">
							<Tooltip.Root>
								<Tooltip.Trigger class="block truncate text-left text-sm">
									{truncateDescription(skill.skill.description)}
								</Tooltip.Trigger>
								{#if skill.skill.description}
									<Tooltip.Content>{skill.skill.description}</Tooltip.Content>
								{/if}
							</Tooltip.Root>
						</TableCell>
						<TableCell><ScopeBadge scope={skill.scope} /></TableCell>
					<TableCell>{skill.agentId}</TableCell>
					<TableCell><ValidationBadge status={skill.skill.status} /></TableCell>
					<TableCell>
						<Tooltip.Root>
							<Tooltip.Trigger class="font-mono text-xs">
								{truncatePath(skill.path)}
							</Tooltip.Trigger>
							<Tooltip.Content>{skill.path}</Tooltip.Content>
						</Tooltip.Root>
					</TableCell>
					<TableCell>
						<Tooltip.Root>
							<Tooltip.Trigger class="text-muted-foreground text-xs">
								{relativeTime(skill.mtime)}
							</Tooltip.Trigger>
							<Tooltip.Content>{skill.mtime ?? "Unknown"}</Tooltip.Content>
						</Tooltip.Root>
					</TableCell>
				</TableRow>
			{/snippet}
		</DataTable>
	{/if}
</div>

<SkillDetailSheet bind:open={detailOpen} skill={selectedSkill} onChanged={handleSkillChanged} />
<SkillImportWizard bind:open={importOpen} onInstalled={handleImported} />
