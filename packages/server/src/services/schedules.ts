import { Cron } from "croner";
import type { Schedule, ScheduleSpec, ScheduleWrite } from "@weave/shared";
import type { InValue } from "@libsql/client";
import type { Db } from "../db/client";
import { getHostname } from "../sync/manager";

interface ScheduleRow {
  id: string;
  workflow_id: string;
  spec_json: string;
  enabled: number;
  inputs_json: string;
  next_run_at: string | null;
  last_run_at: string | null;
  missed_run_policy: "skip" | "runOnce";
  owner_host?: string | null;
}

export class ScheduleServiceError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_found" | "bad_request",
  ) {
    super(message);
    this.name = "ScheduleServiceError";
  }
}

function parseObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function rowToSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    spec: JSON.parse(row.spec_json) as ScheduleSpec,
    enabled: Boolean(row.enabled),
    inputs: parseObject(row.inputs_json),
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    missedRunPolicy: row.missed_run_policy,
    ...(row.owner_host !== undefined ? { ownerHost: row.owner_host } : {}),
  };
}

/**
 * Computes one occurrence strictly after `after`. Croner owns timezone and DST
 * semantics; interval schedules keep their cadence from the supplied anchor.
 */
export function nextOccurrence(
  spec: ScheduleSpec,
  after: Date,
  intervalAnchor: Date = after,
): Date | null {
  if (spec.kind === "once") {
    const at = new Date(spec.at);
    return Number.isFinite(at.getTime()) && at.getTime() > after.getTime() ? at : null;
  }

  if (spec.kind === "interval") {
    const elapsed = Math.max(0, after.getTime() - intervalAnchor.getTime());
    const periods = Math.floor(elapsed / spec.everyMs) + 1;
    return new Date(intervalAnchor.getTime() + periods * spec.everyMs);
  }

  try {
    const cron = new Cron(spec.expr, {
      timezone: spec.tz,
      paused: true,
    });
    const next = cron.nextRun(after);
    cron.stop();
    return next;
  } catch (error) {
    throw new ScheduleServiceError(`Invalid cron schedule: ${String(error)}`, "bad_request");
  }
}

export function initialNextRunAt(spec: ScheduleSpec, now = new Date()): string | null {
  return nextOccurrence(spec, now)?.toISOString() ?? null;
}

export async function listSchedules(db: Db): Promise<Schedule[]> {
  const rows = await db.all<ScheduleRow>(
    "SELECT * FROM schedules ORDER BY enabled DESC, next_run_at ASC, id ASC",
  );
  return rows.map(rowToSchedule);
}

export async function getSchedule(db: Db, id: string): Promise<Schedule | null> {
  const row = await db.get<ScheduleRow>("SELECT * FROM schedules WHERE id = ?", [id]);
  return row ? rowToSchedule(row) : null;
}

async function assertWorkflowExists(db: Db, workflowId: string): Promise<void> {
  const row = await db.get<{ id: string }>("SELECT id FROM workflows WHERE id = ?", [workflowId]);
  if (!row) {
    throw new ScheduleServiceError(`Workflow not found: ${workflowId}`, "bad_request");
  }
}

export async function createSchedule(
  db: Db,
  input: ScheduleWrite,
  now = new Date(),
): Promise<Schedule> {
  await assertWorkflowExists(db, input.workflowId);
  const id = crypto.randomUUID();
  const nextRunAt = input.enabled ? initialNextRunAt(input.spec, now) : null;
  if (input.enabled && !nextRunAt) {
    throw new ScheduleServiceError("Enabled schedule has no future run", "bad_request");
  }
  await db.run(
    `INSERT INTO schedules
      (id, workflow_id, spec_json, enabled, inputs_json, next_run_at, last_run_at, missed_run_policy, owner_host)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      id,
      input.workflowId,
      JSON.stringify(input.spec),
      input.enabled ? 1 : 0,
      JSON.stringify(input.inputs),
      nextRunAt,
      input.missedRunPolicy,
      getHostname(),
    ] as InValue[],
  );
  return (await getSchedule(db, id))!;
}

export async function updateSchedule(
  db: Db,
  id: string,
  input: ScheduleWrite,
  now = new Date(),
): Promise<Schedule | null> {
  const existing = await getSchedule(db, id);
  if (!existing) return null;
  await assertWorkflowExists(db, input.workflowId);
  const nextRunAt = input.enabled ? initialNextRunAt(input.spec, now) : null;
  if (input.enabled && !nextRunAt) {
    throw new ScheduleServiceError("Enabled schedule has no future run", "bad_request");
  }
  await db.run(
    `UPDATE schedules
       SET workflow_id = ?, spec_json = ?, enabled = ?, inputs_json = ?,
           next_run_at = ?, missed_run_policy = ?
     WHERE id = ?`,
    [
      input.workflowId,
      JSON.stringify(input.spec),
      input.enabled ? 1 : 0,
      JSON.stringify(input.inputs),
      nextRunAt,
      input.missedRunPolicy,
      id,
    ],
  );
  return getSchedule(db, id);
}

export async function setScheduleEnabled(
  db: Db,
  id: string,
  enabled: boolean,
  now = new Date(),
): Promise<Schedule | null> {
  const existing = await getSchedule(db, id);
  if (!existing) return null;
  let nextRunAt: string | null = null;
  if (enabled) {
    nextRunAt = initialNextRunAt(existing.spec, now);
    if (!nextRunAt) {
      throw new ScheduleServiceError("Schedule has no future run", "bad_request");
    }
  }
  await db.run("UPDATE schedules SET enabled = ?, next_run_at = ? WHERE id = ?", [
    enabled ? 1 : 0,
    nextRunAt,
    id,
  ]);
  return getSchedule(db, id);
}

export async function deleteSchedule(db: Db, id: string): Promise<boolean> {
  if (!(await getSchedule(db, id))) return false;
  await db.run("DELETE FROM schedules WHERE id = ?", [id]);
  return true;
}

export async function listDueSchedules(
  db: Db,
  now = new Date(),
  inclusive = true,
  ownerHost?: string,
): Promise<Schedule[]> {
  const args: InValue[] = [now.toISOString()];
  let ownerClause = "";
  if (ownerHost) {
    ownerClause = " AND (owner_host = ? OR owner_host IS NULL)";
    args.push(ownerHost);
  }
  const rows = await db.all<ScheduleRow>(
    `SELECT * FROM schedules
      WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at ${inclusive ? "<=" : "<"} ?${ownerClause}
      ORDER BY next_run_at ASC`,
    args,
  );
  return rows.map(rowToSchedule);
}

/**
 * Owner-host-scoped variant of {@link listSchedules} for the scheduler's
 * rearm timer: each host only wakes for schedules it owns (or unowned
 * legacy rows), while the unfiltered API list route still shows everything.
 */
export async function listSchedulesForHost(db: Db, ownerHost: string): Promise<Schedule[]> {
  const rows = await db.all<ScheduleRow>(
    "SELECT * FROM schedules WHERE (owner_host = ? OR owner_host IS NULL) ORDER BY enabled DESC, next_run_at ASC, id ASC",
    [ownerHost],
  );
  return rows.map(rowToSchedule);
}

export async function claimScheduleOccurrence(db: Db, schedule: Schedule): Promise<boolean> {
  if (!schedule.nextRunAt) return false;
  const result = await db.client.execute({
    sql: `UPDATE schedules SET next_run_at = NULL
          WHERE id = ? AND enabled = 1 AND next_run_at = ?`,
    args: [schedule.id, schedule.nextRunAt],
  });
  return result.rowsAffected === 1;
}

export async function releaseScheduleOccurrence(
  db: Db,
  scheduleId: string,
  retryAt: Date,
): Promise<void> {
  await db.run(
    "UPDATE schedules SET next_run_at = ? WHERE id = ? AND enabled = 1 AND next_run_at IS NULL",
    [retryAt.toISOString(), scheduleId],
  );
}

export async function advanceSchedule(
  db: Db,
  schedule: Schedule,
  firedAt: Date,
  claimed = false,
): Promise<Schedule | null> {
  const claimGuard = claimed ? " AND next_run_at IS NULL" : "";
  if (schedule.spec.kind === "once") {
    await db.run(
      `UPDATE schedules SET enabled = 0, next_run_at = NULL, last_run_at = ? WHERE id = ?${claimGuard}`,
      [firedAt.toISOString(), schedule.id],
    );
  } else {
    const anchor = schedule.nextRunAt ? new Date(schedule.nextRunAt) : firedAt;
    const nextRunAt = nextOccurrence(schedule.spec, firedAt, anchor)?.toISOString() ?? null;
    await db.run(
      `UPDATE schedules SET next_run_at = ?, last_run_at = ? WHERE id = ?${claimGuard}`,
      [nextRunAt, firedAt.toISOString(), schedule.id],
    );
  }
  return getSchedule(db, schedule.id);
}

export async function skipMissedSchedule(
  db: Db,
  schedule: Schedule,
  now: Date,
): Promise<Schedule | null> {
  if (schedule.spec.kind === "once") {
    await db.run("UPDATE schedules SET enabled = 0, next_run_at = NULL WHERE id = ?", [
      schedule.id,
    ]);
  } else {
    const anchor = schedule.nextRunAt ? new Date(schedule.nextRunAt) : now;
    const nextRunAt = nextOccurrence(schedule.spec, now, anchor)?.toISOString() ?? null;
    await db.run("UPDATE schedules SET next_run_at = ? WHERE id = ?", [nextRunAt, schedule.id]);
  }
  return getSchedule(db, schedule.id);
}
