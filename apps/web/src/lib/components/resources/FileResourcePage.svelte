<script lang="ts" generics="T extends { id: string; path: string; originalPath: string; isSymlink: boolean; symlinkBroken: boolean; scope: Scope; agentId: AgentId; sizeBytes: number | null; mtime: string | null; lastScannedAt: string }">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ContentPreview from "$lib/components/shared/ContentPreview.svelte";
	import ScopeBadge from "$lib/components/shared/ScopeBadge.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "$lib/components/ui/tooltip";
	import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "$lib/components/ui/sheet";
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogCancel,
		AlertDialogAction,
	} from "$lib/components/ui/alert-dialog";
	import { TableRow, TableCell, TableHead } from "$lib/components/ui/table";
	import ResourceEditor from "./ResourceEditor.svelte";
	import CreateResourceDialog from "./CreateResourceDialog.svelte";
	import DeleteResourceAlert from "./DeleteResourceAlert.svelte";
	import { createQuery } from "$lib/state/query.svelte";
	import {
		getSelectedProjectId,
		scopeQueryParams,
		getResourceVersion,
		invalidateResources,
	} from "$lib/state/app-state.svelte";
	import { getResourceContent } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import type { EditorLanguage } from "$lib/editor/languages";
	import type { Scope, AgentId, ResourceContent, FilePutResponse } from "@weave/shared";
	import PlusIcon from "@lucide/svelte/icons/plus";

	let {
		title,
		description,
		fetcher,
		fileName,
		isEmpty,
		format,
		kind,
		editorLanguage,
		canCreate = false,
	}: {
		title: string;
		description?: string;
		fetcher: (query: { scope: Scope; projectId?: string }) => Promise<T[]>;
		fileName: (item: T) => string;
		isEmpty: (item: T) => boolean;
		format?: (item: T) => "json" | "toml" | "markdown" | "other";
		kind?: "instruction" | "memory" | "config";
		editorLanguage?: (item: T) => EditorLanguage;
		canCreate?: boolean;
	} = $props();

	const query = createQuery(() => fetcher(scopeQueryParams()));

	$effect(() => {
		scopeQueryParams();
		getResourceVersion();
		query.refresh();
	});

	const canDelete = $derived(kind === "instruction" || kind === "memory");

	let selected = $state<T | null>(null);
	let sheetOpen = $state(false);
	let sheetMode = $state<"view" | "edit">("view");
	let content = $state<ResourceContent | null>(null);
	let contentLoading = $state(false);
	let contentError = $state<string | null>(null);
	let contentRequest = 0;

	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let discardConfirmOpen = $state(false);
	let editorRef: ResourceEditor | undefined = $state();

	function openRow(item: T) {
		selected = item;
		sheetOpen = true;
		sheetMode = "view";
		void loadContent(item);
	}

	export function openResourceById(resourceId: string) {
		const item = query.data?.find((candidate) => candidate.id === resourceId);
		if (item) openRow(item);
	}

	async function loadContent(item: T) {
		const requestId = ++contentRequest;
		content = null;
		contentError = null;
		contentLoading = true;
		try {
			const result = await getResourceContent(item.id);
			if (requestId === contentRequest) content = result;
		} catch (err) {
			if (requestId === contentRequest) {
				contentError = err instanceof ApiError ? err.message : "Failed to load file content";
			}
		} finally {
			if (requestId === contentRequest) contentLoading = false;
		}
	}

	function handleSheetOpenChange(next: boolean) {
		if (!next && sheetMode === "edit" && editorRef?.isDirty()) {
			discardConfirmOpen = true;
			return;
		}
		sheetOpen = next;
		if (!next) sheetMode = "view";
	}

	function confirmDiscard() {
		discardConfirmOpen = false;
		sheetOpen = false;
		sheetMode = "view";
	}

	function startEdit() {
		sheetMode = "edit";
	}

	function handleSaved(_newHash: string) {
		sheetMode = "view";
		invalidateResources();
		query.refresh();
		if (selected) void loadContent(selected);
	}

	function handleDeleted() {
		sheetOpen = false;
		sheetMode = "view";
		selected = null;
		query.refresh();
	}

	function handleCreated(_result: FilePutResponse) {
		query.refresh();
	}

	function formatBytes(bytes: number | null): string {
		if (bytes === null) return "—";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function truncatePath(path: string, max = 40): string {
		if (path.length <= max) return path;
		const head = path.slice(0, 12);
		const tail = path.slice(-(max - head.length - 1));
		return `${head}…${tail}`;
	}

	function relativeTime(iso: string | null): string {
		if (!iso) return "—";
		const date = new Date(iso);
		const diffMs = Date.now() - date.getTime();
		const diffSec = Math.round(diffMs / 1000);
		const diffMin = Math.round(diffSec / 60);
		const diffHour = Math.round(diffMin / 60);
		const diffDay = Math.round(diffHour / 24);
		if (Math.abs(diffSec) < 60) return "just now";
		if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
		if (Math.abs(diffHour) < 24) return `${diffHour}h ago`;
		return `${diffDay}d ago`;
	}

	const columnCount = $derived(6 + (format ? 1 : 0));
	const emptyDescription = $derived(
		getSelectedProjectId()
			? "Rescan the selected project to discover files here."
			: "Run a global scan from the Dashboard to discover files here.",
	);
</script>

<div class="page-stack">
	<PageHeader {title} {description}>
		{#snippet actions()}
			{#if canCreate && (kind === "instruction" || kind === "memory")}
				<Button size="sm" onclick={() => (createOpen = true)}>
					<PlusIcon class="size-4" />
					New file
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if query.error}
		<ErrorState message={query.error} onRetry={query.refresh} />
	{:else}
		<TooltipProvider>
			<DataTable
				items={query.data}
				loading={query.loading}
				columns={columnCount}
				emptyTitle={`No ${title.toLowerCase()} yet`}
				emptyDescription={emptyDescription}
			>
				{#snippet header()}
					<TableHead>File name</TableHead>
					<TableHead>Path</TableHead>
					<TableHead>Scope</TableHead>
					<TableHead>Agent</TableHead>
					<TableHead>Size</TableHead>
					<TableHead>Modified</TableHead>
					{#if format}
						<TableHead>Format</TableHead>
					{/if}
				{/snippet}
				{#snippet row(item)}
					<TableRow
						class="cursor-pointer"
						role="button"
						tabindex={0}
						onclick={() => openRow(item)}
						onkeydown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								openRow(item);
							}
						}}
					>
						<TableCell class="font-medium">
							<div class="flex items-center gap-2">
								{fileName(item)}
								{#if isEmpty(item)}
									<Badge variant="outline">Empty</Badge>
								{/if}
								{#if item.symlinkBroken}
									<Badge variant="destructive">Broken symlink</Badge>
								{/if}
							</div>
						</TableCell>
						<TableCell class="text-muted-foreground font-mono text-xs">
							<Tooltip>
								<TooltipTrigger>
									{truncatePath(item.path)}
								</TooltipTrigger>
								<TooltipContent>{item.path}</TooltipContent>
							</Tooltip>
						</TableCell>
						<TableCell><ScopeBadge scope={item.scope} /></TableCell>
						<TableCell>{item.agentId}</TableCell>
						<TableCell class="text-muted-foreground text-xs">{formatBytes(item.sizeBytes)}</TableCell>
						<TableCell class="text-muted-foreground text-xs">
							<Tooltip>
								<TooltipTrigger>
									{relativeTime(item.mtime)}
								</TooltipTrigger>
								<TooltipContent>{item.mtime ?? "Unknown"}</TooltipContent>
							</Tooltip>
						</TableCell>
						{#if format}
							<TableCell>
								<Badge variant="secondary">{format(item)}</Badge>
							</TableCell>
						{/if}
					</TableRow>
				{/snippet}
			</DataTable>
		</TooltipProvider>
	{/if}
</div>

<Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
	<SheetContent class={sheetMode === "edit" ? "overflow-y-auto sm:max-w-2xl" : "overflow-y-auto"}>
		{#if selected}
			<SheetHeader>
				<SheetTitle>{fileName(selected)}</SheetTitle>
				<SheetDescription>{selected.path}</SheetDescription>
			</SheetHeader>
			<div class="flex flex-col gap-4 px-4 pb-4 text-sm">
				{#if sheetMode === "view"}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-muted-foreground text-xs">Scope</p>
							<ScopeBadge scope={selected.scope} />
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Agent</p>
							<p>{selected.agentId}</p>
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Size</p>
							<p>{formatBytes(selected.sizeBytes)}</p>
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Modified</p>
							<p>{selected.mtime ?? "Unknown"}</p>
						</div>
						{#if format}
							<div>
								<p class="text-muted-foreground text-xs">Format</p>
								<Badge variant="secondary">{format(selected)}</Badge>
							</div>
						{/if}
						<div>
							<p class="text-muted-foreground text-xs">Empty</p>
							<p>{isEmpty(selected) ? "Yes" : "No"}</p>
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Symlink</p>
							<p>{selected.isSymlink ? (selected.symlinkBroken ? "Broken" : "Resolves") : "No"}</p>
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Original path</p>
							<p class="font-mono text-xs break-all">{selected.originalPath}</p>
						</div>
						<div>
							<p class="text-muted-foreground text-xs">Last scanned</p>
							<p>{selected.lastScannedAt}</p>
						</div>
					</div>
					<div class="flex flex-col gap-2 border-t pt-3">
						<h3 class="text-sm font-medium">Content preview</h3>
						{#if contentLoading}
							<Skeleton class="h-48 w-full" />
						{:else if contentError}
							<Alert variant="destructive">
								<AlertTitle>Unable to load content</AlertTitle>
								<AlertDescription>{contentError}</AlertDescription>
							</Alert>
						{:else if content}
							{#if content.truncated}
								<Alert>
									<AlertTitle>Preview truncated</AlertTitle>
									<AlertDescription>Only the first 256 KiB are shown.</AlertDescription>
								</Alert>
							{/if}
							<ContentPreview
								content={content.content}
								emptyMessage="This file is empty or no content is available."
							/>
						{:else}
							<p class="text-muted-foreground text-sm">No content is available.</p>
						{/if}
					</div>

					{#if kind && editorLanguage}
						<div class="flex justify-end gap-2 border-t pt-3">
							{#if canDelete}
								<Button variant="destructive" onclick={() => (deleteOpen = true)}>Delete</Button>
							{/if}
							{#if content?.truncated}
								<Tooltip>
									<TooltipTrigger>
										<Button disabled>Edit</Button>
									</TooltipTrigger>
									<TooltipContent>File too large to edit here</TooltipContent>
								</Tooltip>
							{:else}
								<Button onclick={startEdit} disabled={contentLoading || !content}>Edit</Button>
							{/if}
						</div>
					{/if}
				{:else if kind && editorLanguage && content}
					<ResourceEditor
						bind:this={editorRef}
						resourceId={selected.id}
						{kind}
						language={editorLanguage(selected)}
						initialContent={content.content ?? ""}
						initialHash={content.hash ?? ""}
						onSaved={handleSaved}
						onCancel={() => (sheetMode = "view")}
					/>
				{/if}
			</div>
		{/if}
	</SheetContent>
</Sheet>

<AlertDialog bind:open={discardConfirmOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
			<AlertDialogDescription>
				You have unsaved edits. Closing now will discard them.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Keep editing</AlertDialogCancel>
			<AlertDialogAction onclick={confirmDiscard}>Discard</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

{#if canCreate && (kind === "instruction" || kind === "memory")}
	<CreateResourceDialog bind:open={createOpen} kind={kind} onCreated={handleCreated} />
{/if}

{#if canDelete && selected}
	<DeleteResourceAlert
		bind:open={deleteOpen}
		kind={kind === "instruction" ? "instruction" : "memory"}
		resourceId={selected.id}
		path={selected.path}
		onDeleted={handleDeleted}
	/>
{/if}
