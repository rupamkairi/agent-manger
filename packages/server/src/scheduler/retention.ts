import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Db } from "../db/client";
import { getSettings } from "../services/settings";
import { getHostname } from "../sync/manager";

const DAY_MS = 24 * 60 * 60 * 1000;

interface RetentionCandidate {
  id: string;
}

export interface RetentionSweepResult {
  deletedJobIds: string[];
  cutoff: string;
}

/**
 * Deletes complete parent runs older than the configured cutoff. Cascading
 * foreign keys remove child jobs and job_logs, while the newest parent run for
 * every extant workflow is always retained.
 */
export async function runRetentionSweep(
  db: Db,
  logsRoot: string,
  now = new Date(),
): Promise<RetentionSweepResult> {
  const { jobRetentionDays } = await getSettings(db);
  const cutoff = new Date(now.getTime() - jobRetentionDays * DAY_MS).toISOString();
  const candidates = await db.all<RetentionCandidate>(
    `SELECT candidate.id
       FROM jobs candidate
      WHERE candidate.parent_job_id IS NULL
        AND candidate.ended_at IS NOT NULL
        AND candidate.ended_at < ?
        AND (candidate.origin_host = ? OR candidate.origin_host IS NULL)
        AND (
          candidate.workflow_id IS NULL
          OR EXISTS (
            SELECT 1
              FROM jobs newer
             WHERE newer.parent_job_id IS NULL
               AND newer.workflow_id = candidate.workflow_id
               AND (
                 newer.queued_at > candidate.queued_at
                 OR (newer.queued_at = candidate.queued_at AND newer.id > candidate.id)
               )
          )
        )
      ORDER BY candidate.ended_at ASC`,
    [cutoff, getHostname()],
  );

  const deletedJobIds: string[] = [];
  const resolvedLogsRoot = resolve(logsRoot);
  for (const { id } of candidates) {
    const runJobs = await db.all<{ id: string }>(
      "SELECT id FROM jobs WHERE id = ? OR parent_job_id = ?",
      [id, id],
    );
    await db.run("DELETE FROM jobs WHERE id = ?", [id]);
    await Promise.all(
      runJobs.map((job) => {
        const directory = resolve(resolvedLogsRoot, job.id);
        return dirname(directory) === resolvedLogsRoot
          ? rm(directory, { recursive: true, force: true })
          : Promise.resolve();
      }),
    );
    deletedJobIds.push(id);
  }
  return { deletedJobIds, cutoff };
}

export interface RetentionServiceOptions {
  now?: () => Date;
  intervalMs?: number;
  onError?: (error: unknown) => void;
}

export class JobRetentionService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => Date;
  private readonly intervalMs: number;
  private readonly onError: (error: unknown) => void;

  constructor(
    private readonly db: Db,
    private readonly logsRoot: string,
    options: RetentionServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.intervalMs = options.intervalMs ?? DAY_MS;
    this.onError = options.onError ?? ((error) => console.error("Job retention sweep failed:", error));
  }

  async start(): Promise<void> {
    if (this.timer) return;
    await this.sweep();
    this.timer = setInterval(() => void this.sweep(), this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async sweep(): Promise<RetentionSweepResult | null> {
    try {
      return await runRetentionSweep(this.db, this.logsRoot, this.now());
    } catch (error) {
      this.onError(error);
      return null;
    }
  }
}
