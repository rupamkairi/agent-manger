<script lang="ts">
	import PageHeader from "$lib/components/shell/PageHeader.svelte";
	import DataTable from "$lib/components/shared/DataTable.svelte";
	import ErrorState from "$lib/components/shared/ErrorState.svelte";
	import ScheduleDialog from "$lib/components/workflows/ScheduleDialog.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Switch } from "$lib/components/ui/switch";
	import { TableCell, TableHead, TableRow } from "$lib/components/ui/table";
	import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
	import { createQuery } from "$lib/state/query.svelte";
	import { createSchedule, deleteSchedule, listSchedules, listWorkflows, setScheduleEnabled, updateSchedule } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { formatDateTime, formatScheduleSpec } from "$lib/workflows/format";
	import { toast } from "svelte-sonner";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import type { Schedule, ScheduleWrite } from "@weave/shared";

	const schedulesQuery = createQuery(() => listSchedules());
	const workflowsQuery = createQuery(() => listWorkflows(), { silent: true });
	let dialogOpen = $state(false);
	let selected = $state<Schedule | null>(null);
	let saving = $state(false);
	function workflowName(id: string) { return workflowsQuery.data?.find((workflow) => workflow.id === id)?.name ?? id; }
	function openCreate() { selected = null; dialogOpen = true; }
	function openEdit(schedule: Schedule) { selected = schedule; dialogOpen = true; }
	async function save(value: ScheduleWrite) { saving = true; try { if (selected) await updateSchedule(selected.id, value); else await createSchedule(value); dialogOpen = false; await schedulesQuery.refresh(); toast.success(selected ? "Schedule updated" : "Schedule created"); } catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not save schedule"); } finally { saving = false; } }
	async function toggle(schedule: Schedule) { try { await setScheduleEnabled(schedule.id, !schedule.enabled); await schedulesQuery.refresh(); } catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not update schedule"); } }
	async function remove(schedule: Schedule) { if (!confirm("Delete this schedule?")) return; try { await deleteSchedule(schedule.id); await schedulesQuery.refresh(); toast.success("Schedule deleted"); } catch (err) { toast.error(err instanceof ApiError ? err.message : "Could not delete schedule"); } }
</script>

<div class="page-stack"><PageHeader title="Schedules" description="Run workflows once, on an interval, or from a timezone-aware cron expression.">{#snippet actions()}<Button size="sm" onclick={openCreate} disabled={!workflowsQuery.data?.length}><PlusIcon class="size-4" />New schedule</Button>{/snippet}</PageHeader>
	{#if schedulesQuery.error}<ErrorState message={schedulesQuery.error} onRetry={schedulesQuery.refresh} />{:else}<DataTable items={schedulesQuery.data} loading={schedulesQuery.loading} columns={6} emptyTitle="No schedules yet" emptyDescription={workflowsQuery.data?.length ? "Schedule a workflow to run without manual intervention." : "Create a workflow before adding a schedule."}>
		{#snippet header()}<TableHead>Workflow</TableHead><TableHead>Schedule</TableHead><TableHead>State</TableHead><TableHead>Next run</TableHead><TableHead>Last run</TableHead><TableHead class="text-right">Actions</TableHead>{/snippet}
		{#snippet row(schedule)}<TableRow><TableCell class="font-medium">{workflowName(schedule.workflowId)}</TableCell><TableCell class="font-mono text-xs">{formatScheduleSpec(schedule.spec)}</TableCell><TableCell><div class="flex items-center gap-2"><Switch checked={schedule.enabled} aria-label={`${schedule.enabled ? "Pause" : "Enable"} schedule for ${workflowName(schedule.workflowId)}`} onCheckedChange={() => toggle(schedule)} /><Badge variant={schedule.enabled ? "secondary" : "outline"}>{schedule.enabled ? "Enabled" : "Paused"}</Badge></div></TableCell><TableCell>{formatDateTime(schedule.nextRunAt)}</TableCell><TableCell>{formatDateTime(schedule.lastRunAt)}</TableCell><TableCell class="text-right"><DropdownMenu><DropdownMenuTrigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon" aria-label="Schedule actions"><EllipsisIcon class="size-4" /></Button>{/snippet}</DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onclick={() => openEdit(schedule)}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onclick={() => remove(schedule)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>{/snippet}
	</DataTable>{/if}
</div>

<ScheduleDialog bind:open={dialogOpen} schedule={selected} workflows={workflowsQuery.data ?? []} {saving} onSave={save} />
