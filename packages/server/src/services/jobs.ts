import type { Job, JobDetail } from "@weave/shared";
import type { InValue } from "@libsql/client";
import type { Db } from "../db/client";
import { getHostname } from "../sync/manager";

interface JobRow {
  id: string; workflow_id: string | null; parent_job_id: string | null; step_id: string | null;
  state: Job["state"]; attempt: number; input_json: string; output: string | null; error: string | null;
  log_ref: string | null; queued_at: string; started_at: string | null; ended_at: string | null;
  step_count?: number | null; origin_host?: string | null;
}

export function rowToJob(row: JobRow): Job {
  return {
    id: row.id, workflowId: row.workflow_id, parentJobId: row.parent_job_id, stepId: row.step_id,
    state: row.state, attempt: Number(row.attempt), input: JSON.parse(row.input_json), output: row.output,
    error: row.error, logRef: row.log_ref, queuedAt: row.queued_at, startedAt: row.started_at,
    endedAt: row.ended_at,
    ...(row.step_count !== undefined && row.step_count !== null
      ? { stepCount: Number(row.step_count) }
      : {}),
    ...(row.origin_host !== undefined ? { originHost: row.origin_host } : {}),
  };
}

export interface JobFilters { workflowId?: string; state?: Job["state"] }

export async function listJobs(db: Db, filters: JobFilters = {}): Promise<Job[]> {
  const clauses = ["parent_job_id IS NULL"];
  const args: InValue[] = [];
  if (filters.workflowId) { clauses.push("workflow_id = ?"); args.push(filters.workflowId); }
  if (filters.state) { clauses.push("state = ?"); args.push(filters.state); }
  const rows = await db.all<JobRow>(
    `SELECT jobs.*,
            (SELECT COUNT(*) FROM jobs child WHERE child.parent_job_id = jobs.id) AS step_count
       FROM jobs
      WHERE ${clauses.join(" AND ")} ORDER BY queued_at DESC`, args,
  );
  return rows.map(rowToJob);
}

export async function recoverInterruptedJobs(db: Db): Promise<number> {
  const hostname = getHostname();
  const interrupted = await db.all<{ id: string }>(
    "SELECT id FROM jobs WHERE state IN ('queued', 'running') AND (origin_host = ? OR origin_host IS NULL)",
    [hostname],
  );
  if (interrupted.length === 0) return 0;
  await db.run(
    "UPDATE jobs SET state = 'failed', error = ?, ended_at = ? WHERE state IN ('queued', 'running') AND (origin_host = ? OR origin_host IS NULL)",
    ["Interrupted by server restart", new Date().toISOString(), hostname],
  );
  return interrupted.length;
}

export async function getJob(db: Db, id: string): Promise<Job | null> {
  const row = await db.get<JobRow>("SELECT * FROM jobs WHERE id = ?", [id]);
  return row ? rowToJob(row) : null;
}

export async function getJobDetail(db: Db, id: string): Promise<JobDetail | null> {
  const job = await getJob(db, id);
  if (!job) return null;
  const children = (await db.all<JobRow>("SELECT * FROM jobs WHERE parent_job_id = ? ORDER BY queued_at, step_id", [id])).map(rowToJob);
  return { ...job, children };
}

export async function insertJob(db: Db, job: Job): Promise<void> {
  await db.run(
    `INSERT INTO jobs (id, workflow_id, parent_job_id, step_id, state, attempt, input_json, output, error, log_ref, queued_at, started_at, ended_at, origin_host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [job.id, job.workflowId, job.parentJobId, job.stepId, job.state, job.attempt, JSON.stringify(job.input),
      job.output, job.error, job.logRef, job.queuedAt, job.startedAt, job.endedAt, getHostname()] as InValue[],
  );
}

export async function patchJob(db: Db, id: string, patch: Partial<Job>): Promise<Job | null> {
  const columns: Record<string, string> = {
    state: "state", attempt: "attempt", output: "output", error: "error", logRef: "log_ref",
    startedAt: "started_at", endedAt: "ended_at",
  };
  const entries = Object.entries(patch).filter(([key]) => key in columns);
  if (entries.length > 0) {
    await db.run(`UPDATE jobs SET ${entries.map(([key]) => `${columns[key]} = ?`).join(", ")} WHERE id = ?`,
      [...entries.map(([, value]) => value as InValue), id]);
  }
  return getJob(db, id);
}
