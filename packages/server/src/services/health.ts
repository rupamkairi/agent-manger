import { existsSync } from "node:fs";
import type { AgentId, HealthIssue, HealthSeverity, HealthSummary, Scope } from "@weave/shared";
import type { Db } from "../db/client";

const STALE_SCAN_MS = 7 * 24 * 60 * 60 * 1000;

export interface HealthFilters {
  severity?: HealthSeverity;
  scope?: Scope;
  projectId?: string;
  agentId?: AgentId;
}

interface DetectionRow {
  agent_id: string;
  state: string;
  detected_at: string;
}

interface SkillIssueRow {
  id: string;
  resource_id: string;
  code: string;
  severity: string;
  message: string;
  agent_id: string;
  project_id: string | null;
}

interface BrokenResourceRow {
  id: string;
  agent_id: string;
  project_id: string | null;
}

interface ProjectRow {
  id: string;
  root_path: string;
  last_scanned_at: string | null;
}

async function collectAgentDetectionIssues(db: Db): Promise<HealthIssue[]> {
  const rows = await db.all<DetectionRow>("SELECT agent_id, state, detected_at FROM agent_detections");
  const issues: HealthIssue[] = [];
  for (const row of rows) {
    if (row.state === "installed") continue;
    const severity: HealthSeverity = row.state === "missing" ? "warning" : "unknown";
    const message =
      row.state === "missing"
        ? `Agent ${row.agent_id} not installed`
        : `Agent ${row.agent_id} detection state unknown`;
    issues.push({
      id: `agent-detection:${row.agent_id}`,
      severity,
      source: "agent-detection",
      agentId: row.agent_id as AgentId,
      projectId: null,
      resourceId: null,
      message,
      detectedAt: row.detected_at,
    });
  }
  return issues;
}

async function collectSkillIssueIssues(db: Db): Promise<HealthIssue[]> {
  const rows = await db.all<SkillIssueRow>(
    `SELECT si.id as id, si.resource_id as resource_id, si.code as code, si.severity as severity,
            si.message as message, r.agent_id as agent_id, r.project_id as project_id
     FROM skill_issues si
     JOIN resources r ON r.id = si.resource_id`,
  );
  const now = new Date().toISOString();
  return rows.map((row) => ({
    id: `skill-issue:${row.id}`,
    severity: (row.severity === "error" ? "error" : "warning") as HealthSeverity,
    source: "skill-validation" as const,
    agentId: row.agent_id as AgentId,
    projectId: row.project_id,
    resourceId: row.resource_id,
    message: row.message,
    detectedAt: now,
  }));
}

async function collectBrokenSymlinkIssues(db: Db): Promise<HealthIssue[]> {
  const rows = await db.all<BrokenResourceRow>(
    "SELECT id, agent_id, project_id FROM resources WHERE symlink_broken = 1",
  );
  const now = new Date().toISOString();
  return rows.map((row) => ({
    id: `broken-symlink:${row.id}`,
    severity: "warning" as HealthSeverity,
    source: "resource-scan" as const,
    agentId: row.agent_id as AgentId,
    projectId: row.project_id,
    resourceId: row.id,
    message: "Resource is a broken symlink",
    detectedAt: now,
  }));
}

async function collectProjectIssues(db: Db): Promise<HealthIssue[]> {
  const rows = await db.all<ProjectRow>("SELECT id, root_path, last_scanned_at FROM projects");
  const now = Date.now();
  const issues: HealthIssue[] = [];

  for (const row of rows) {
    if (!existsSync(row.root_path)) {
      issues.push({
        id: `project-missing:${row.id}`,
        severity: "error",
        source: "project",
        agentId: null,
        projectId: row.id,
        resourceId: null,
        message: `Project root path no longer exists: ${row.root_path}`,
        detectedAt: new Date().toISOString(),
      });
      continue;
    }

    const scannedAt = row.last_scanned_at ? Date.parse(row.last_scanned_at) : null;
    if (scannedAt === null || now - scannedAt > STALE_SCAN_MS) {
      issues.push({
        id: `project-stale-scan:${row.id}`,
        severity: "info",
        source: "project",
        agentId: null,
        projectId: row.id,
        resourceId: null,
        message: row.last_scanned_at
          ? `Project has not been scanned in over 7 days`
          : `Project has never been scanned`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return issues;
}

export async function getHealthSummary(db: Db, filters: HealthFilters): Promise<HealthSummary> {
  const [agentIssues, skillIssues, symlinkIssues, projectIssues] = await Promise.all([
    collectAgentDetectionIssues(db),
    collectSkillIssueIssues(db),
    collectBrokenSymlinkIssues(db),
    collectProjectIssues(db),
  ]);

  const scope = filters.scope ?? "global";
  let issues = [
    ...agentIssues,
    ...(scope === "global" ? [...skillIssues, ...symlinkIssues].filter((issue) => issue.projectId === null) : []),
    ...(scope === "project"
      ? [...skillIssues, ...symlinkIssues, ...projectIssues].filter((issue) =>
          filters.projectId ? issue.projectId === filters.projectId : issue.projectId !== null,
        )
      : []),
  ];

  if (filters.severity) {
    issues = issues.filter((issue) => issue.severity === filters.severity);
  }
  if (filters.projectId && scope === "global") {
    issues = issues.filter((issue) => issue.projectId === filters.projectId);
  }
  if (filters.agentId) {
    issues = issues.filter((issue) => issue.agentId === filters.agentId);
  }

  const counts = { info: 0, warning: 0, error: 0, unknown: 0 };
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }

  return { counts, issues };
}
