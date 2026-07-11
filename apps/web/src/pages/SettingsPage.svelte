<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Switch } from "$lib/components/ui/switch";
	import { Badge } from "$lib/components/ui/badge";
	import StringListEditor from "$lib/components/settings/StringListEditor.svelte";
	import {
		getSettings,
		patchSettings,
		getProjectSettings,
		putProjectSettings,
		getSyncConfig,
		putSyncConfig,
		getSyncStatus,
		syncNow,
	} from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { createQuery } from "$lib/state/query.svelte";
	import { formatDateTime } from "$lib/workflows/format";
	import { toast } from "svelte-sonner";
	import { getSelectedProjectId } from "$lib/state/app-state.svelte";
	import { AGENT_IDS, type Settings, type AgentId, type ProjectSettings } from "@weave/shared";
	import SaveIcon from "@lucide/svelte/icons/save";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";

	const settingsQuery = createQuery(() => getSettings(), { silent: true });

	let initialized = $state(false);
	let saving = $state(false);
	let validationError = $state<string | null>(null);
	let scanIgnoreGlobsText = $state("");
	let detectionTimeoutText = $state("");
	let maxScanDepthText = $state("");
	let maxConcurrentRunsText = $state("");
	let jobRetentionDaysText = $state("");

	function applySettings(settings: Settings) {
		scanIgnoreGlobsText = settings.scanIgnoreGlobs.join("\n");
		detectionTimeoutText = String(settings.detectionTimeoutMs);
		maxScanDepthText = String(settings.maxScanDepth);
		maxConcurrentRunsText = String(settings.maxConcurrentRuns);
		jobRetentionDaysText = String(settings.jobRetentionDays);
		initialized = true;
	}

	$effect(() => {
		if (!initialized && settingsQuery.data) applySettings(settingsQuery.data);
	});

	function parseInteger(label: string, value: string, min: number, max: number): number | null {
		const parsed = Number(value.trim());
		if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
			validationError = `${label} must be an integer between ${min} and ${max}.`;
			return null;
		}
		return parsed;
	}

	async function save() {
		validationError = null;
		const detectionTimeoutMs = parseInteger("Detection timeout", detectionTimeoutText, 500, 30000);
		if (detectionTimeoutMs === null) return;
		const maxScanDepth = parseInteger("Maximum scan depth", maxScanDepthText, 1, 32);
		if (maxScanDepth === null) return;
		const maxConcurrentRuns = parseInteger("Maximum concurrent runs", maxConcurrentRunsText, 1, 16);
		if (maxConcurrentRuns === null) return;
		const jobRetentionDays = parseInteger("Job retention", jobRetentionDaysText, 1, 3650);
		if (jobRetentionDays === null) return;

		const scanIgnoreGlobs = scanIgnoreGlobsText
			.split("\n")
			.map((glob) => glob.trim())
			.filter(Boolean);

		saving = true;
		try {
			const next = await patchSettings({ scanIgnoreGlobs, detectionTimeoutMs, maxScanDepth, maxConcurrentRuns, jobRetentionDays });
			applySettings(next);
			toast.success("Settings saved");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
		} finally {
			saving = false;
		}
	}

	// Project settings

	let projectId = $derived(getSelectedProjectId());
	let projectSettings = $state<ProjectSettings | null>(null);
	let projectSettingsLoading = $state(false);
	let projectSettingsError = $state<string | null>(null);
	let projectSaving = $state(false);
	let ignoredPathsText = $state("");
	let customResourcePaths = $state<string[]>([]);
	let preferredAgents = $state<AgentId[]>([]);

	function applyProjectSettings(settings: ProjectSettings) {
		projectSettings = settings;
		ignoredPathsText = settings.ignoredPaths.join("\n");
		customResourcePaths = [...settings.customResourcePaths];
		preferredAgents = [...settings.preferredAgents];
	}

	async function loadProjectSettings(id: string) {
		projectSettingsLoading = true;
		projectSettingsError = null;
		try {
			const result = await getProjectSettings(id);
			applyProjectSettings(result);
		} catch (err) {
			projectSettingsError = err instanceof ApiError ? err.message : "Failed to load project settings";
		} finally {
			projectSettingsLoading = false;
		}
	}

	$effect(() => {
		const id = projectId;
		if (id) {
			void loadProjectSettings(id);
		} else {
			projectSettings = null;
		}
	});

	function toggleAgent(agentId: AgentId, checked: boolean) {
		if (checked) {
			if (!preferredAgents.includes(agentId)) preferredAgents = [...preferredAgents, agentId];
		} else {
			preferredAgents = preferredAgents.filter((id) => id !== agentId);
		}
	}

	async function saveProjectSettings() {
		const id = projectId;
		if (!id) return;
		const ignoredPaths = ignoredPathsText
			.split("\n")
			.map((path) => path.trim())
			.filter(Boolean);

		projectSaving = true;
		try {
			const result = await putProjectSettings(id, {
				ignoredPaths,
				customResourcePaths: customResourcePaths.map((path) => path.trim()).filter(Boolean),
				preferredAgents,
			});
			applyProjectSettings(result);
			toast.success("Project settings saved");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to save project settings");
		} finally {
			projectSaving = false;
		}
	}

	// Sync

	const syncConfigQuery = createQuery(() => getSyncConfig(), { silent: true });
	const syncStatusQuery = createQuery(() => getSyncStatus(), { silent: true });

	let syncInitialized = $state(false);
	let syncSaving = $state(false);
	let syncingNow = $state(false);
	let syncValidationError = $state<string | null>(null);
	let syncNowError = $state<string | null>(null);
	let syncEnabled = $state(false);
	let syncUrlText = $state("");
	let syncAuthTokenText = $state("");
	let syncIntervalSecondsText = $state("60");

	function applySyncConfig(config: { enabled: boolean; syncUrl?: string; syncIntervalMs?: number }) {
		syncEnabled = config.enabled;
		syncUrlText = config.syncUrl ?? "";
		syncAuthTokenText = "";
		syncIntervalSecondsText = String(Math.round((config.syncIntervalMs ?? 60_000) / 1000));
		syncInitialized = true;
	}

	$effect(() => {
		if (!syncInitialized && syncConfigQuery.data) applySyncConfig(syncConfigQuery.data);
	});

	async function saveSyncConfig() {
		syncValidationError = null;
		const syncIntervalSeconds = Number(syncIntervalSecondsText.trim());
		if (!Number.isInteger(syncIntervalSeconds) || syncIntervalSeconds < 1) {
			syncValidationError = "Sync interval must be an integer of at least 1 second.";
			return;
		}
		if (!syncUrlText.trim()) {
			syncValidationError = "Sync URL is required.";
			return;
		}

		syncSaving = true;
		try {
			const result = await putSyncConfig({
				enabled: syncEnabled,
				syncUrl: syncUrlText.trim(),
				authToken: syncAuthTokenText.trim() ? syncAuthTokenText.trim() : undefined,
				syncIntervalMs: syncIntervalSeconds * 1000,
			});
			applySyncConfig(result.config);
			await syncStatusQuery.refresh();
			toast.success("Sync settings saved");
		} catch (err) {
			syncValidationError = err instanceof ApiError ? err.message : "Failed to save sync settings";
		} finally {
			syncSaving = false;
		}
	}

	async function runSyncNow() {
		syncNowError = null;
		syncingNow = true;
		try {
			await syncNow();
			await syncStatusQuery.refresh();
			toast.success("Synced");
		} catch (err) {
			syncNowError = err instanceof ApiError ? err.message : "Sync failed";
		} finally {
			syncingNow = false;
		}
	}
</script>

<div class="page-stack">
	<PageHeader title="Settings" description="Configure resource scanning and agent detection." />

	{#if settingsQuery.loading}
		<Skeleton class="h-96 w-full" />
	{:else if settingsQuery.error}
		<ErrorState message={settingsQuery.error} onRetry={settingsQuery.refresh} />
	{:else if initialized}
		<Card class="max-w-2xl">
			<CardHeader>
				<CardTitle>Scan settings</CardTitle>
				<CardDescription>These values apply to future scans.</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-6">
				<div class="flex flex-col gap-2">
					<Label for="scan-ignore-globs">Ignore globs</Label>
					<Textarea
						id="scan-ignore-globs"
						bind:value={scanIgnoreGlobsText}
						rows={6}
						placeholder="**/node_modules/**\n**/.git/**"
					/>
					<p class="text-muted-foreground text-xs">One glob per line. Blank lines are ignored.</p>
				</div>

				<div class="grid gap-6 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="detection-timeout">Detection timeout (ms)</Label>
						<Input
							id="detection-timeout"
							bind:value={detectionTimeoutText}
							type="text"
							inputmode="numeric"
							aria-invalid={validationError?.includes("Detection timeout")}
						/>
						<p class="text-muted-foreground text-xs">Allowed range: 500–30,000 ms.</p>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="max-scan-depth">Maximum scan depth</Label>
						<Input
							id="max-scan-depth"
							bind:value={maxScanDepthText}
							type="text"
							inputmode="numeric"
							aria-invalid={validationError?.includes("Maximum scan depth")}
						/>
						<p class="text-muted-foreground text-xs">Allowed range: 1–32 levels.</p>
					</div>
				</div>

				{#if validationError}
					<Alert variant="destructive">
						<AlertTitle>Check your settings</AlertTitle>
						<AlertDescription>{validationError}</AlertDescription>
					</Alert>
				{/if}

				<div class="flex justify-end">
					<Button onclick={save} disabled={saving}>
						<SaveIcon class="size-4" />
						{saving ? "Saving…" : "Save settings"}
					</Button>
				</div>
			</CardContent>
		</Card>

		<Card class="max-w-2xl">
			<CardHeader>
				<CardTitle>Workflow execution</CardTitle>
				<CardDescription>Control runner capacity and how long completed job history is kept.</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-6 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="max-concurrent-runs">Maximum concurrent runs</Label>
					<Input id="max-concurrent-runs" bind:value={maxConcurrentRunsText} type="text" inputmode="numeric" aria-invalid={validationError?.includes("Maximum concurrent runs")} />
					<p class="text-muted-foreground text-xs">Allowed range: 1–16 workflows.</p>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="job-retention-days">Job retention (days)</Label>
					<Input id="job-retention-days" bind:value={jobRetentionDaysText} type="text" inputmode="numeric" aria-invalid={validationError?.includes("Job retention")} />
					<p class="text-muted-foreground text-xs">Allowed range: 1–3,650 days.</p>
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card class="max-w-2xl">
		<CardHeader>
			<CardTitle>Sync</CardTitle>
			<CardDescription>Replicate this host's database to a remote sync server.</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-6">
			{#if syncConfigQuery.loading || syncStatusQuery.loading}
				<Skeleton class="h-48 w-full" />
			{:else if syncConfigQuery.error}
				<ErrorState message={syncConfigQuery.error} onRetry={syncConfigQuery.refresh} />
			{:else if syncInitialized}
				<div class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm">
					<Badge variant={syncStatusQuery.data?.enabled ? "secondary" : "outline"}>
						{syncStatusQuery.data?.enabled ? "Enabled" : "Disabled"}
					</Badge>
					<span><span class="text-muted-foreground">Host</span> {syncStatusQuery.data?.hostname ?? "—"}</span>
					<span>
						<span class="text-muted-foreground">Last synced</span>
						{syncStatusQuery.data?.lastSyncAt ? formatDateTime(syncStatusQuery.data.lastSyncAt) : "Never"}
					</span>
				</div>

				{#if syncStatusQuery.data?.error}
					<p class="text-destructive text-sm">{syncStatusQuery.data.error}</p>
				{/if}

				{#if syncStatusQuery.data?.restartRequired}
					<Alert>
						<AlertTitle>Restart required</AlertTitle>
						<AlertDescription>Restart the server to apply the new sync configuration.</AlertDescription>
					</Alert>
				{/if}

				<div class="flex items-center gap-2">
					<Switch checked={syncEnabled} onCheckedChange={(checked) => (syncEnabled = checked)} aria-label="Enable sync" />
					<Label>Enable sync</Label>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="sync-url">Sync URL</Label>
					<Input
						id="sync-url"
						bind:value={syncUrlText}
						type="text"
						placeholder="libsql://your-db.example.com"
						aria-invalid={syncValidationError?.includes("Sync URL")}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="sync-auth-token">Auth token</Label>
					<Input id="sync-auth-token" bind:value={syncAuthTokenText} type="password" placeholder="Leave blank for none" />
					<p class="text-muted-foreground text-xs">Stored on this machine only. Leaving this blank clears any saved token.</p>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="sync-interval">Sync interval (seconds)</Label>
					<Input
						id="sync-interval"
						bind:value={syncIntervalSecondsText}
						type="text"
						inputmode="numeric"
						aria-invalid={syncValidationError?.includes("Sync interval")}
					/>
					<p class="text-muted-foreground text-xs">Minimum: 1 second.</p>
				</div>

				{#if syncValidationError}
					<Alert variant="destructive">
						<AlertTitle>Check your sync settings</AlertTitle>
						<AlertDescription>{syncValidationError}</AlertDescription>
					</Alert>
				{/if}

				{#if syncNowError}
					<p class="text-destructive text-sm">{syncNowError}</p>
				{/if}

				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={runSyncNow} disabled={syncingNow || !syncStatusQuery.data?.enabled}>
						<RefreshCwIcon class="size-4" />
						{syncingNow ? "Syncing…" : "Sync now"}
					</Button>
					<Button onclick={saveSyncConfig} disabled={syncSaving}>
						<SaveIcon class="size-4" />
						{syncSaving ? "Saving…" : "Save sync settings"}
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	{#if projectId}
		<Card class="max-w-2xl">
			<CardHeader>
				<CardTitle>Project settings</CardTitle>
				<CardDescription>Overrides that apply only to the selected project's scans.</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-6">
				{#if projectSettingsLoading}
					<Skeleton class="h-48 w-full" />
				{:else if projectSettingsError}
					<ErrorState
						message={projectSettingsError}
						onRetry={() => projectId && loadProjectSettings(projectId)}
					/>
				{:else if projectSettings}
					<div class="flex flex-col gap-2">
						<Label for="ignored-paths">Ignored paths</Label>
						<Textarea
							id="ignored-paths"
							bind:value={ignoredPathsText}
							rows={4}
							placeholder="**/dist/**\n**/vendor/**"
						/>
						<p class="text-muted-foreground text-xs">One glob per line. Blank lines are ignored.</p>
					</div>

					<div class="flex flex-col gap-2">
						<Label>Custom resource paths</Label>
						<StringListEditor
							bind:value={customResourcePaths}
							placeholder="path/to/resource"
							addLabel="Add path"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<Label>Preferred agents</Label>
						<div class="flex flex-col gap-2">
							{#each AGENT_IDS as agentId (agentId)}
								<label class="flex items-center gap-2 text-sm">
									<Checkbox
										checked={preferredAgents.includes(agentId)}
										onCheckedChange={(checked) => toggleAgent(agentId, checked === true)}
									/>
									{agentId}
								</label>
							{/each}
						</div>
					</div>

					<div class="flex justify-end">
						<Button onclick={saveProjectSettings} disabled={projectSaving}>
							<SaveIcon class="size-4" />
							{projectSaving ? "Saving…" : "Save project settings"}
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
