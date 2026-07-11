import type { Component } from "svelte";

export interface RouteDef {
	path: string;
	title: string;
	load: () => Promise<{ default: Component<any> }>;
}

export const routes: RouteDef[] = [
	{ path: "/", title: "Dashboard", load: () => import("./pages/DashboardPage.svelte") },
	{ path: "/projects", title: "Projects", load: () => import("./pages/ProjectsPage.svelte") },
	{ path: "/agents", title: "Agents", load: () => import("./pages/Agents.svelte") },
	{
		path: "/agents/:agentId",
		title: "Agent",
		load: () => import("./pages/AgentDetail.svelte"),
	},
	{ path: "/skills", title: "Skills", load: () => import("./pages/SkillsPage.svelte") },
	{
		path: "/instructions",
		title: "Instructions",
		load: () => import("./pages/Instructions.svelte"),
	},
	{ path: "/memory", title: "Memory", load: () => import("./pages/Memory.svelte") },
	{ path: "/configs", title: "Configs", load: () => import("./pages/Configs.svelte") },
	{ path: "/health", title: "Health", load: () => import("./pages/HealthPage.svelte") },
	{ path: "/terminal", title: "Terminal", load: () => import("./pages/TerminalPage.svelte") },
	{ path: "/workflows", title: "Workflows", load: () => import("./pages/WorkflowsPage.svelte") },
	{ path: "/workflows/new", title: "New workflow", load: () => import("./pages/WorkflowEditorPage.svelte") },
	{ path: "/workflows/:workflowId/edit", title: "Edit workflow", load: () => import("./pages/WorkflowEditorPage.svelte") },
	{ path: "/jobs", title: "Jobs", load: () => import("./pages/JobsPage.svelte") },
	{ path: "/jobs/:jobId", title: "Job detail", load: () => import("./pages/JobDetailPage.svelte") },
	{ path: "/schedules", title: "Schedules", load: () => import("./pages/SchedulesPage.svelte") },
	{ path: "/settings", title: "Settings", load: () => import("./pages/SettingsPage.svelte") },
];

export const notFoundRoute: RouteDef = {
	path: "*",
	title: "Not found",
	load: () => import("./pages/NotFound.svelte"),
};
