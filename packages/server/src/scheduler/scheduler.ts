import type { DependencyCheckResult, Schedule } from "@weave/shared";
import type { Db } from "../db/client";
import { getHostname } from "../sync/manager";
import {
  advanceSchedule,
  claimScheduleOccurrence,
  listDueSchedules,
  listSchedulesForHost,
  releaseScheduleOccurrence,
  skipMissedSchedule,
} from "../services/schedules";

const MAX_TIMER_DELAY_MS = 60_000;
const ONCE_RETRY_DELAY_MS = 60_000;

export interface ScheduleEngine {
  checkDependencies(
    workflowId: string,
    inputs: Record<string, unknown>,
  ): Promise<DependencyCheckResult>;
  enqueueWorkflow(
    workflowId: string,
    inputs: Record<string, unknown>,
    context: { trigger: "schedule"; scheduleId: string },
  ): Promise<unknown>;
}

export interface SchedulerOptions {
  now?: () => Date;
  onError?: (error: unknown, context: string) => void;
}

/**
 * Persistent scheduler with exactly one wake-up timer. The timer is capped at
 * one minute so clock changes and externally-mutated rows are discovered.
 */
export class WorkflowScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private armGeneration = 0;
  private started = false;
  private processing: Promise<void> | null = null;
  private readonly now: () => Date;
  private readonly onError: (error: unknown, context: string) => void;

  constructor(
    private readonly db: Db,
    private readonly engine: ScheduleEngine,
    options: SchedulerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.onError =
      options.onError ??
      ((error, context) => console.error(`Scheduler ${context} failed:`, error));
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.reconcileMissedRuns();
    await this.rearm();
  }

  stop(): void {
    this.started = false;
    this.armGeneration += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async rearm(): Promise<void> {
    if (!this.started) return;
    const generation = ++this.armGeneration;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    const schedules = await listSchedulesForHost(this.db, getHostname());
    if (!this.started || generation !== this.armGeneration) return;
    const next = schedules
      .filter((schedule) => schedule.enabled && schedule.nextRunAt)
      .map((schedule) => new Date(schedule.nextRunAt!).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];

    const delay =
      next === undefined
        ? MAX_TIMER_DELAY_MS
        : Math.min(MAX_TIMER_DELAY_MS, Math.max(0, next - this.now().getTime()));
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.onWake(), delay);
    this.timer.unref?.();
  }

  async reconcileMissedRuns(): Promise<void> {
    const now = this.now();
    const due = await listDueSchedules(this.db, now, false, getHostname());
    for (const schedule of due) {
      if (schedule.missedRunPolicy === "skip") {
        await skipMissedSchedule(this.db, schedule, now);
      } else {
        await this.fire(schedule, now);
      }
    }
  }

  async processDue(): Promise<void> {
    const now = this.now();
    const due = await listDueSchedules(this.db, now, true, getHostname());
    for (const schedule of due) {
      await this.fire(schedule, now);
    }
  }

  private async onWake(): Promise<void> {
    if (!this.started) return;
    if (!this.processing) {
      this.processing = this.processDue()
        .catch((error) => this.onError(error, "wake"))
        .finally(() => {
          this.processing = null;
        });
    }
    await this.processing;
    await this.rearm();
  }

  private async fire(schedule: Schedule, firedAt: Date): Promise<void> {
    if (!(await claimScheduleOccurrence(this.db, schedule))) return;
    let enqueued = false;
    try {
      const result = await this.engine.checkDependencies(schedule.workflowId, schedule.inputs);
      if (result.ok) {
        await this.engine.enqueueWorkflow(schedule.workflowId, schedule.inputs, {
          trigger: "schedule",
          scheduleId: schedule.id,
        });
        enqueued = true;
      } else {
        this.onError(result, `dependency check for schedule ${schedule.id}`);
      }
    } catch (error) {
      this.onError(error, `fire for schedule ${schedule.id}`);
    } finally {
      if (schedule.spec.kind === "once" && !enqueued) {
        await releaseScheduleOccurrence(
          this.db,
          schedule.id,
          new Date(firedAt.getTime() + ONCE_RETRY_DELAY_MS),
        );
      } else {
        // Recurring occurrences advance on dependency failure so a broken
        // requirement cannot hot-loop the scheduler.
        await advanceSchedule(this.db, schedule, firedAt, true);
      }
    }
  }
}
