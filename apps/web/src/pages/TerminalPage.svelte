<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import TerminalView from "$lib/terminal/TerminalView.svelte";
	import DeleteTerminalSessionAlert from "$lib/terminal/DeleteTerminalSessionAlert.svelte";
	import { Card, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui/tabs";
	import { createQuery } from "$lib/state/query.svelte";
	import { getTerminalAvailability, listTerminalSessions, createTerminalSession } from "$lib/api/endpoints";
	import { getSelectedProjectId } from "$lib/state/app-state.svelte";
	import { ApiError } from "$lib/api/client";
	import { toast } from "svelte-sonner";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import XIcon from "@lucide/svelte/icons/x";
	import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
	import type { TerminalSession } from "@weave/shared";

	const availabilityQuery = createQuery(() => getTerminalAvailability());
	const sessionsQuery = createQuery(() => listTerminalSessions(), { silent: true });

	let selectedSessionId = $state<string | null>(null);
	let creating = $state(false);
	let deleteOpen = $state(false);
	let sessionToDelete = $state<TerminalSession | null>(null);

	$effect(() => {
		const sessions = sessionsQuery.data;
		if (!sessions) return;
		if (selectedSessionId && sessions.some((s) => s.id === selectedSessionId)) return;
		selectedSessionId = sessions[0]?.id ?? null;
	});

	function tabLabel(session: TerminalSession): string {
		const segment = session.cwd.replace(/\/+$/, "").split("/").filter(Boolean).pop();
		const base = segment || "~";
		return `${base} #${session.id.slice(-4)}`;
	}

	async function handleCreate() {
		creating = true;
		try {
			const session = await createTerminalSession(getSelectedProjectId());
			await sessionsQuery.refresh();
			selectedSessionId = session.id;
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not create terminal session");
		} finally {
			creating = false;
		}
	}

	function requestDelete(event: MouseEvent, session: TerminalSession) {
		event.preventDefault();
		event.stopPropagation();
		sessionToDelete = session;
		deleteOpen = true;
	}

	function handleExit() {
		sessionsQuery.refresh();
	}
</script>

<div class="page-stack flex min-h-0 flex-1 flex-col">
	<PageHeader title="Terminal" description="Run shell sessions on the machine hosting Weave.">
		{#snippet actions()}
			{#if availabilityQuery.data?.available}
				<Button size="sm" onclick={handleCreate} disabled={creating}>
					<PlusIcon class="size-4" />
					New session
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if availabilityQuery.error}
		<ErrorState message={availabilityQuery.error} onRetry={availabilityQuery.refresh} />
	{:else if availabilityQuery.loading}
		<div class="text-muted-foreground text-sm">Checking terminal availability…</div>
	{:else if availabilityQuery.data?.available === false}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<SquareTerminalIcon class="text-muted-foreground size-4" />
					Terminal unavailable
				</CardTitle>
				<CardDescription>
					No PTY provider (bun-pty or node-pty) could be loaded on the server.
				</CardDescription>
			</CardHeader>
		</Card>
	{:else if sessionsQuery.error}
		<ErrorState message={sessionsQuery.error} onRetry={sessionsQuery.refresh} />
	{:else if !sessionsQuery.data?.length}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<SquareTerminalIcon class="text-muted-foreground size-4" />
					No sessions yet
				</CardTitle>
				<CardDescription>Start a terminal session to run commands on the host.</CardDescription>
			</CardHeader>
		</Card>
	{:else}
		<Tabs
			value={selectedSessionId ?? ""}
			onValueChange={(value) => (selectedSessionId = value || null)}
			class="flex min-h-0 flex-1 flex-col gap-3"
		>
			<TabsList>
				{#each sessionsQuery.data as session (session.id)}
					<TabsTrigger value={session.id}>
						<span>{tabLabel(session)}</span>
						<span
							role="button"
							tabindex="0"
							aria-label={`Close session ${tabLabel(session)}`}
							class="hover:bg-background/60 -mr-1 ml-1 inline-flex size-4 items-center justify-center rounded-sm"
							onclick={(event) => requestDelete(event, session)}
							onkeydown={(event) => {
								if (event.key === "Enter" || event.key === " ") requestDelete(event as unknown as MouseEvent, session);
							}}
						>
							<XIcon class="size-3" />
						</span>
					</TabsTrigger>
				{/each}
			</TabsList>
			{#each sessionsQuery.data as session (session.id)}
				<TabsContent value={session.id} class="flex min-h-0 flex-1 flex-col">
					{#if selectedSessionId === session.id}
						{#key session.id}
							<TerminalView sessionId={session.id} onExit={handleExit} />
						{/key}
					{/if}
				</TabsContent>
			{/each}
		</Tabs>
	{/if}
</div>

<DeleteTerminalSessionAlert
	bind:open={deleteOpen}
	session={sessionToDelete}
	onDeleted={() => sessionsQuery.refresh()}
/>
