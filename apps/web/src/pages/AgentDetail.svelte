<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import EmptyState from "$lib/components/shared/EmptyState.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import SeverityBadge from "$lib/components/shared/SeverityBadge.svelte";
	import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbPage,
		BreadcrumbSeparator,
	} from "$lib/components/ui/breadcrumb";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui/tabs";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { createQuery } from "$lib/state/query.svelte";
	import { getAgent, getHealth, detectAgent } from "$lib/api/endpoints";
	import { link } from "$lib/router.svelte";
	import { scopeQueryParams } from "$lib/state/app-state.svelte";
	import { toast } from "svelte-sonner";
	import type { AgentId } from "@weave/shared";

	let { params }: { params: Record<string, string> } = $props();

	const agentId = $derived(params.agentId as AgentId);

	const agentQuery = createQuery(() => getAgent(agentId, scopeQueryParams()));
	const healthQuery = createQuery(() => getHealth({ ...scopeQueryParams(), agentId }));

	$effect(() => {
		scopeQueryParams();
		agentQuery.refresh();
		healthQuery.refresh();
	});

	const warnings = $derived(
		(healthQuery.data?.issues ?? []).filter((issue) => issue.severity !== "info"),
	);

	let detecting = $state(false);

	async function refreshDetection() {
		detecting = true;
		try {
			await detectAgent(agentId);
			await Promise.all([agentQuery.refresh(), healthQuery.refresh()]);
			toast.success("Agent detection refreshed");
		} catch {
			// createQuery/fetchJson already surfaces the error toast
		} finally {
			detecting = false;
		}
	}
</script>

<div class="page-stack">
	<Breadcrumb>
		<BreadcrumbList>
			<BreadcrumbItem>
				<BreadcrumbLink href="/agents">
					{#snippet child({ props })}
						<a {...props} href="/agents" use:link>Agents</a>
					{/snippet}
				</BreadcrumbLink>
			</BreadcrumbItem>
			<BreadcrumbSeparator />
			<BreadcrumbItem>
				<BreadcrumbPage>{agentQuery.data?.name ?? agentId}</BreadcrumbPage>
			</BreadcrumbItem>
		</BreadcrumbList>
	</Breadcrumb>

	{#if agentQuery.loading}
		<Skeleton class="h-24 w-full" />
	{:else if agentQuery.error}
		<ErrorState message={agentQuery.error} onRetry={agentQuery.refresh} />
	{:else if agentQuery.data}
		{@const agent = agentQuery.data}
		<PageHeader title={agent.name} description="Agent detection and configuration.">
			{#snippet actions()}
				<StatusBadge state={agent.detection?.state ?? "unknown"} />
				<span class="text-muted-foreground text-sm">{agent.detection?.version ?? "No version"}</span>
				<Button size="sm" onclick={refreshDetection} disabled={detecting}>
					{detecting ? "Refreshing…" : "Refresh detection"}
				</Button>
			{/snippet}
		</PageHeader>

		{#snippet locationList(title: string, paths: string[])}
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">{title}</CardTitle>
				</CardHeader>
				<CardContent>
					{#if paths.length === 0}
						<EmptyState title="None verified" />
					{:else}
						<div class="flex flex-col gap-1">
							{#each paths as path (path)}
								<div class="font-mono text-xs">{path}</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		{/snippet}

		<Tabs value="overview">
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="resources">Resource locations</TabsTrigger>
			</TabsList>

				<TabsContent value="overview">
					<div class="flex flex-col gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Detection</CardTitle>
							</CardHeader>
							<CardContent class="grid gap-3 text-sm">
								<div class="flex items-center justify-between gap-4">
									<span class="text-muted-foreground">Binary path</span>
									<span class="font-mono text-xs">{agent.detection?.binaryPath ?? "—"}</span>
								</div>
								<div class="flex items-center justify-between gap-4">
									<span class="text-muted-foreground">Version</span>
									<span>{agent.detection?.version ?? "—"}</span>
								</div>
								<div class="flex items-center justify-between gap-4">
									<span class="text-muted-foreground">Detected at</span>
									<span>{agent.detection?.detectedAt ?? "—"}</span>
								</div>
								{#if agent.detection?.error}
									<div class="flex items-center justify-between gap-4">
										<span class="text-muted-foreground">Error</span>
										<span class="text-destructive">{agent.detection.error}</span>
									</div>
								{/if}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Resource summary</CardTitle>
							</CardHeader>
							<CardContent class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
								<div><p class="text-muted-foreground text-xs">Skills</p><p>{agent.resourceCounts.skills}</p></div>
								<div><p class="text-muted-foreground text-xs">Instructions</p><p>{agent.resourceCounts.instructions}</p></div>
								<div><p class="text-muted-foreground text-xs">Memory</p><p>{agent.resourceCounts.memory}</p></div>
								<div><p class="text-muted-foreground text-xs">Configs</p><p>{agent.resourceCounts.configs}</p></div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Resource warnings</CardTitle>
							</CardHeader>
							<CardContent>
								{#if healthQuery.loading}
									<Skeleton class="h-16 w-full" />
								{:else if healthQuery.error}
									<ErrorState message={healthQuery.error} onRetry={healthQuery.refresh} />
								{:else if warnings.length === 0}
									<p class="text-muted-foreground text-sm">No warnings for the current scope.</p>
								{:else}
									<div class="flex flex-col gap-2">
										{#each warnings as issue (issue.id)}
											<div class="flex items-start gap-2 text-sm">
												<SeverityBadge severity={issue.severity} />
												<span>{issue.message}</span>
											</div>
										{/each}
									</div>
								{/if}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

			<TabsContent value="resources" class="flex flex-col gap-4">
				{@render locationList("Global config paths", agent.globalConfigPaths)}
				{@render locationList("Project config paths", agent.projectConfigPaths)}
				{@render locationList("Global skill roots", agent.globalSkillRoots)}
				{@render locationList("Project skill roots", agent.projectSkillRoots)}
				{@render locationList("Instruction patterns (global)", agent.instructionFilePatterns.global)}
				{@render locationList("Instruction patterns (project)", agent.instructionFilePatterns.project)}
					{@render locationList("Memory patterns (global)", agent.memoryPatterns.global)}
					{@render locationList("Memory patterns (project)", agent.memoryPatterns.project)}
					{@render locationList("Supported commands", agent.supportedCommands)}
			</TabsContent>
		</Tabs>
	{:else}
		<EmptyState title="Agent not found" />
	{/if}
</div>
