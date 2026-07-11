<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import AddProjectDialog from "$lib/components/projects/AddProjectDialog.svelte";
	import RemoveProjectAlert from "$lib/components/projects/RemoveProjectAlert.svelte";
	import { TableRow, TableCell, TableHead } from "$lib/components/ui/table";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import {
		Tooltip,
		TooltipContent,
		TooltipTrigger,
		TooltipProvider,
	} from "$lib/components/ui/tooltip";
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	} from "$lib/components/ui/dropdown-menu";
	import { createQuery } from "$lib/state/query.svelte";
	import { listProjects, rescanProject } from "$lib/api/endpoints";
	import { toast } from "svelte-sonner";
	import { ApiError } from "$lib/api/client";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import type { Project } from "@weave/shared";

	const projectsQuery = createQuery(() => listProjects());

	let addDialogOpen = $state(false);
	let removeAlertOpen = $state(false);
	let projectToRemove = $state<Project | null>(null);
	let rescanningIds = $state<Set<string>>(new Set());

	function formatRelativeTime(value: string | null): string {
		if (!value) return "Never";
		const then = new Date(value).getTime();
		const diffMs = Date.now() - then;
		const diffSec = Math.round(diffMs / 1000);
		if (diffSec < 60) return "Just now";
		const diffMin = Math.round(diffSec / 60);
		if (diffMin < 60) return `${diffMin} min ago`;
		const diffHour = Math.round(diffMin / 60);
		if (diffHour < 24) return `${diffHour} hr ago`;
		const diffDay = Math.round(diffHour / 24);
		if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
		const diffMonth = Math.round(diffDay / 30);
		if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
		const diffYear = Math.round(diffMonth / 12);
		return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
	}

	function openRemoveAlert(project: Project) {
		projectToRemove = project;
		removeAlertOpen = true;
	}

	async function handleRescan(project: Project) {
		if (rescanningIds.has(project.id)) return;
		rescanningIds = new Set(rescanningIds).add(project.id);
		try {
			const result = await rescanProject(project.id);
			toast.success(`Rescanned "${project.name}": found ${result.resourceCount} resource(s)`);
			await projectsQuery.refresh();
		} catch (err) {
			const message = err instanceof ApiError ? err.message : "Failed to rescan project";
			toast.error(message);
		} finally {
			const next = new Set(rescanningIds);
			next.delete(project.id);
			rescanningIds = next;
		}
	}
</script>

<TooltipProvider>
	<div class="page-stack">
		<PageHeader title="Projects" description="Projects Weave is tracking on this machine.">
			{#snippet actions()}
				<Button size="sm" onclick={() => (addDialogOpen = true)}>
					<PlusIcon class="size-4" />
					Add project
				</Button>
			{/snippet}
		</PageHeader>

		{#if projectsQuery.error}
			<ErrorState message={projectsQuery.error} onRetry={projectsQuery.refresh} />
		{:else}
			<DataTable
				items={projectsQuery.data}
				loading={projectsQuery.loading}
				columns={5}
				emptyTitle="No projects yet"
				emptyDescription="Add a project to start scanning its resources."
			>
				{#snippet header()}
					<TableHead>Name</TableHead>
					<TableHead>Path</TableHead>
					<TableHead>Last scanned</TableHead>
					<TableHead>Status</TableHead>
					<TableHead class="text-right">Actions</TableHead>
				{/snippet}
				{#snippet row(project)}
					<TableRow>
						<TableCell class="font-medium">{project.name}</TableCell>
						<TableCell class="text-muted-foreground font-mono text-xs">{project.rootPath}</TableCell>
						<TableCell>
							<Tooltip>
								<TooltipTrigger>
									{formatRelativeTime(project.lastScannedAt)}
								</TooltipTrigger>
								<TooltipContent>
									{project.lastScannedAt ?? "Never scanned"}
								</TooltipContent>
							</Tooltip>
						</TableCell>
						<TableCell>
							{#if !project.exists}
								<Badge variant="destructive">Missing</Badge>
							{:else}
								<Badge variant="secondary">Valid</Badge>
							{/if}
						</TableCell>
						<TableCell class="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon" aria-label="Project actions">
											<EllipsisIcon class="size-4" />
										</Button>
									{/snippet}
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										disabled={rescanningIds.has(project.id)}
										onclick={() => handleRescan(project)}
									>
										{#if rescanningIds.has(project.id)}
											<LoaderCircleIcon class="size-4 animate-spin" />
										{/if}
										Rescan
									</DropdownMenuItem>
									<DropdownMenuItem
										variant="destructive"
										onclick={() => openRemoveAlert(project)}
									>
										Remove
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				{/snippet}
			</DataTable>
		{/if}
	</div>
</TooltipProvider>

<AddProjectDialog bind:open={addDialogOpen} onSuccess={() => projectsQuery.refresh()} />
<RemoveProjectAlert
	bind:open={removeAlertOpen}
	project={projectToRemove}
	onSuccess={() => projectsQuery.refresh()}
/>
