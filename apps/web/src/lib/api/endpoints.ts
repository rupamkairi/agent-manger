import { z } from "zod";
import {
	AgentDetectionResultSchema,
	AgentInfoSchema,
	ConfigListSchema,
	HealthSummarySchema,
	InstructionListSchema,
	MemoryListSchema,
	FileDeleteResponseSchema,
	FilePutResponseSchema,
	InstructionConflictSchema,
	MultiTargetResponseSchema,
	ProjectSchema,
	ProjectRescanResultSchema,
	GlobalScanResultSchema,
	RemovedResultSchema,
	ProjectSettingsSchema,
	ResourceContentSchema,
	SettingsSchema,
	SettingsPatchSchema,
	SkillDeleteResponseSchema,
	SkillLoadResultSchema,
	SkillResourceSchema,
	SyncDiffSchema,
	SyncResultSchema,
	SyncConfigPublicSchema,
	SyncConfigPutResultSchema,
	DbSyncStatusSchema,
	WorkflowDefinitionSchema,
	WorkflowSummaryListSchema,
	DependencyCheckResultSchema,
	WorkflowRunResultSchema,
	JobListSchema,
	JobDetailSchema,
	JobCancelResultSchema,
	type JobState,
	ScheduleListSchema,
	ScheduleSchema,
	DeleteResultSchema,
	TerminalAvailabilitySchema,
	TerminalSessionListSchema,
	TerminalSessionSchema,
	type AddProjectRequest,
	type AgentId,
	type FileCreateRequest,
	type InstallTarget,
	type ProjectSettings,
	type Scope,
	type SettingsPatch,
	type SkillSource,
	type SyncDiffQuery,
	type SyncRequest,
	type SyncFileConfig,
	type WorkflowDefinition,
	type WorkflowRunRequest,
	type ScheduleWrite,
} from "@weave/shared";
import { fetchJson, toQueryString } from "./client";

const ProjectListSchema = z.array(ProjectSchema);
const AgentInfoListSchema = z.array(AgentInfoSchema);
const AgentDetectionListSchema = z.array(AgentDetectionResultSchema);
const SkillListSchema = z.array(SkillResourceSchema);

export interface ResourceScopeQuery {
	scope?: Scope;
	agentId?: AgentId;
	projectId?: string;
	status?: string;
}

// Projects

export function listProjects() {
	return fetchJson("/projects", ProjectListSchema);
}

export function addProject(body: AddProjectRequest) {
	return fetchJson("/projects", ProjectSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function removeProject(id: string) {
	return fetchJson(`/projects/${encodeURIComponent(id)}`, RemovedResultSchema, {
		method: "DELETE",
	});
}

export function rescanProject(id: string) {
	return fetchJson(`/projects/${encodeURIComponent(id)}/rescan`, ProjectRescanResultSchema, {
		method: "POST",
	});
}

export function scanGlobal() {
	return fetchJson("/scan/global", GlobalScanResultSchema, { method: "POST" });
}

// Agents

export function listAgents(query: ResourceScopeQuery = {}) {
	return fetchJson(`/agents${toQueryString(query)}`, AgentInfoListSchema);
}

export function getAgent(agentId: AgentId, query: ResourceScopeQuery = {}) {
	return fetchJson(`/agents/${encodeURIComponent(agentId)}${toQueryString(query)}`, AgentInfoSchema);
}

export function detectAllAgents() {
	return fetchJson("/agents/detect", AgentDetectionListSchema, { method: "POST" });
}

export function detectAgent(agentId: AgentId) {
	return fetchJson(`/agents/${encodeURIComponent(agentId)}/detect`, AgentDetectionResultSchema, {
		method: "POST",
	});
}

// Resources

export function listSkills(query: ResourceScopeQuery = {}) {
	return fetchJson(`/skills${toQueryString(query)}`, SkillListSchema);
}

export function listInstructions(query: ResourceScopeQuery = {}) {
	return fetchJson(`/instructions${toQueryString(query)}`, InstructionListSchema);
}

export function listMemory(query: ResourceScopeQuery = {}) {
	return fetchJson(`/memory${toQueryString(query)}`, MemoryListSchema);
}

export function listConfigs(query: ResourceScopeQuery = {}) {
	return fetchJson(`/configs${toQueryString(query)}`, ConfigListSchema);
}

export function getResourceContent(id: string) {
	return fetchJson(`/resources/${encodeURIComponent(id)}/content`, ResourceContentSchema);
}

// Skills write path

export function loadSkillImport(source: SkillSource) {
	return fetchJson("/skills/import/load", SkillLoadResultSchema, {
		method: "POST",
		body: JSON.stringify({ source }),
	});
}

export function installSkillImport(stagingId: string, targets: InstallTarget[]) {
	return fetchJson("/skills/import/install", MultiTargetResponseSchema, {
		method: "POST",
		body: JSON.stringify({ stagingId, targets }),
	});
}

export function installSkill(resourceId: string, targets: InstallTarget[]) {
	return fetchJson("/skills/install", MultiTargetResponseSchema, {
		method: "POST",
		body: JSON.stringify({ resourceId, targets }),
	});
}

export function deleteSkill(id: string) {
	return fetchJson(`/skills/${encodeURIComponent(id)}`, SkillDeleteResponseSchema, {
		method: "DELETE",
		body: JSON.stringify({ confirm: true }),
	});
}

export function getSkillSyncDiff(query: SyncDiffQuery) {
	return fetchJson(`/skills/sync-diff${toQueryString(query)}`, SyncDiffSchema);
}

export function syncSkill(body: SyncRequest) {
	return fetchJson("/skills/sync", SyncResultSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

// File edits

export interface FilePutBody {
	content: string;
	ifHash: string;
}

export function putInstruction(id: string, body: FilePutBody) {
	return fetchJson(`/instructions/${encodeURIComponent(id)}`, FilePutResponseSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function putMemory(id: string, body: FilePutBody) {
	return fetchJson(`/memory/${encodeURIComponent(id)}`, FilePutResponseSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function putConfig(id: string, body: FilePutBody) {
	return fetchJson(`/configs/${encodeURIComponent(id)}`, FilePutResponseSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function createInstruction(body: FileCreateRequest) {
	return fetchJson("/instructions", FilePutResponseSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function createMemory(body: FileCreateRequest) {
	return fetchJson("/memory", FilePutResponseSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function deleteInstruction(id: string) {
	return fetchJson(`/instructions/${encodeURIComponent(id)}`, FileDeleteResponseSchema, {
		method: "DELETE",
		body: JSON.stringify({ confirm: true }),
	});
}

export function deleteMemory(id: string) {
	return fetchJson(`/memory/${encodeURIComponent(id)}`, FileDeleteResponseSchema, {
		method: "DELETE",
		body: JSON.stringify({ confirm: true }),
	});
}

// Instruction conflicts

const InstructionConflictListSchema = z.array(InstructionConflictSchema);

export function listInstructionConflicts(query: { scope?: Scope; projectId?: string } = {}) {
	return fetchJson(`/instructions/conflicts${toQueryString(query)}`, InstructionConflictListSchema);
}

// Project settings

export function getProjectSettings(id: string) {
	return fetchJson(`/projects/${encodeURIComponent(id)}/settings`, ProjectSettingsSchema);
}

export function putProjectSettings(id: string, body: ProjectSettings) {
	return fetchJson(`/projects/${encodeURIComponent(id)}/settings`, ProjectSettingsSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

// Health

export interface HealthQuery {
	scope?: Scope;
	severity?: string;
	projectId?: string;
	agentId?: AgentId;
}

export function getHealth(query: HealthQuery = {}) {
	return fetchJson(`/health${toQueryString(query)}`, HealthSummarySchema);
}

// Settings

export function getSettings() {
	return fetchJson("/settings", SettingsSchema);
}

export function patchSettings(patch: SettingsPatch) {
	SettingsPatchSchema.parse(patch);
	return fetchJson("/settings", SettingsSchema, {
		method: "PATCH",
		body: JSON.stringify(patch),
	});
}

// Sync

export function getSyncConfig() {
	return fetchJson("/sync/config", SyncConfigPublicSchema);
}

export function putSyncConfig(body: SyncFileConfig) {
	return fetchJson("/sync/config", SyncConfigPutResultSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function getSyncStatus() {
	return fetchJson("/sync/status", DbSyncStatusSchema);
}

export function syncNow() {
	return fetchJson("/sync/now", DbSyncStatusSchema, { method: "POST" });
}

// Workflows

export function listWorkflows() {
	return fetchJson("/workflows", WorkflowSummaryListSchema);
}

export function getWorkflow(id: string) {
	return fetchJson(`/workflows/${encodeURIComponent(id)}`, WorkflowDefinitionSchema);
}

export function createWorkflow(definition: WorkflowDefinition) {
	return fetchJson("/workflows", WorkflowDefinitionSchema, {
		method: "POST",
		body: JSON.stringify(definition),
	});
}

export function updateWorkflow(id: string, definition: WorkflowDefinition) {
	return fetchJson(`/workflows/${encodeURIComponent(id)}`, WorkflowDefinitionSchema, {
		method: "PUT",
		body: JSON.stringify(definition),
	});
}

export function deleteWorkflow(id: string) {
	return fetchJson(`/workflows/${encodeURIComponent(id)}`, DeleteResultSchema, { method: "DELETE" });
}

export function checkWorkflow(id: string, inputs: Record<string, unknown> = {}) {
	return fetchJson(`/workflows/${encodeURIComponent(id)}/check`, DependencyCheckResultSchema, {
		method: "POST",
		body: JSON.stringify({ inputs }),
	});
}

export function runWorkflow(id: string, body: WorkflowRunRequest) {
	return fetchJson(`/workflows/${encodeURIComponent(id)}/run`, WorkflowRunResultSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

// Jobs

export interface JobQuery {
	workflowId?: string;
	state?: JobState;
}

export function listJobs(query: JobQuery = {}) {
	return fetchJson(`/jobs${toQueryString(query)}`, JobListSchema);
}

export function getJob(id: string) {
	return fetchJson(`/jobs/${encodeURIComponent(id)}`, JobDetailSchema);
}

export function cancelJob(id: string) {
	return fetchJson(`/jobs/${encodeURIComponent(id)}/cancel`, JobCancelResultSchema, { method: "POST" });
}

// Schedules

export function listSchedules() {
	return fetchJson("/schedules", ScheduleListSchema);
}

export function createSchedule(body: ScheduleWrite) {
	return fetchJson("/schedules", ScheduleSchema, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function updateSchedule(id: string, body: ScheduleWrite) {
	return fetchJson(`/schedules/${encodeURIComponent(id)}`, ScheduleSchema, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

export function deleteSchedule(id: string) {
	return fetchJson(`/schedules/${encodeURIComponent(id)}`, DeleteResultSchema, { method: "DELETE" });
}

export function setScheduleEnabled(id: string, enabled: boolean) {
	return fetchJson(`/schedules/${encodeURIComponent(id)}/enabled`, ScheduleSchema, {
		method: "PATCH",
		body: JSON.stringify({ enabled }),
	});
}

// Terminal

const TerminalDeleteResultSchema = z.object({ deleted: z.boolean() });

export function getTerminalAvailability() {
	return fetchJson("/terminal/availability", TerminalAvailabilitySchema);
}

export function listTerminalSessions() {
	return fetchJson("/terminal/sessions", TerminalSessionListSchema);
}

export function createTerminalSession(projectId: string | null) {
	return fetchJson("/terminal/sessions", TerminalSessionSchema, {
		method: "POST",
		body: JSON.stringify({ projectId }),
	});
}

export function deleteTerminalSession(id: string) {
	return fetchJson(`/terminal/sessions/${encodeURIComponent(id)}`, TerminalDeleteResultSchema, {
		method: "DELETE",
		body: JSON.stringify({ confirm: true }),
	});
}
