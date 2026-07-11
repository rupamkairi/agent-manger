<script lang="ts">
	import { ModeWatcher } from "mode-watcher";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Button } from "$lib/components/ui/button";
	import AppSidebar from "$lib/components/shell/AppSidebar.svelte";
	import CommandPalette from "$lib/components/shell/CommandPalette.svelte";
	import { getPath, createMatcher } from "$lib/router.svelte";
	import { routes, notFoundRoute } from "./routes";
	import SearchIcon from "@lucide/svelte/icons/search";
	import type { Component } from "svelte";

	const matcher = createMatcher(routes.map((r) => ({ path: r.path, route: r })));

	let commandOpen = $state(false);

	const path = $derived(getPath());
	const match = $derived(matcher(path));
	const activeRoute = $derived(match?.route ?? notFoundRoute);
	const params = $derived(match?.params ?? {});

	let PageComponent = $state<Component<any> | null>(null);

	$effect(() => {
		let cancelled = false;
		activeRoute.load().then((mod) => {
			if (!cancelled) PageComponent = mod.default;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

<ModeWatcher />
<Toaster richColors position="top-right" />
<CommandPalette bind:open={commandOpen} />

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header class="sticky top-0 z-10 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b bg-background px-4 sm:grid-cols-[1fr_minmax(20rem,42rem)_1fr]">
			<Sidebar.Trigger />
			<Button
				variant="outline"
				size="sm"
				class="text-muted-foreground w-full justify-between gap-2 sm:col-start-2"
				aria-label="Open command palette"
				onclick={() => (commandOpen = true)}
			>
				<span class="flex items-center gap-2">
					<SearchIcon class="size-4" />
					<span class="hidden sm:inline">Search</span>
				</span>
				<kbd class="bg-muted hidden rounded px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
			</Button>
		</header>
		<div class="min-h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
			<div class="mx-auto w-full max-w-[1600px]">
				{#if PageComponent}
					{@const Comp = PageComponent}
					<Comp {params} />
				{/if}
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
