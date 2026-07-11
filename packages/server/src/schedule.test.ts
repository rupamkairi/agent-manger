import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DependencyCheckResult, ScheduleWrite } from "@weave/shared";
import { createDb, type Db } from "./db/client";
import { runMigrations } from "./db/migrate";
import { JobRetentionService, runRetentionSweep } from "./scheduler/retention";
import { type ScheduleEngine, WorkflowScheduler } from "./scheduler/scheduler";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  initialNextRunAt,
  listSchedules,
  nextOccurrence,
  setScheduleEnabled,
  updateSchedule,
} from "./services/schedules";

const roots: string[] = [];

async function testDb(): Promise<{ db: Db; root: string }> {
  const root = await mkdtemp(join(tmpdir(), "weave-schedule-test-"));
  roots.push(root);
  const db = createDb(join(root, "weave.db"));
  await runMigrations(db);
  await db.run(
    "INSERT INTO workflows (id, name, version, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ["workflow-1", "Workflow", 1, "{}", "2025-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z"],
  );
  return { db, root };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const intervalInput: ScheduleWrite = {
  workflowId: "workflow-1",
  spec: { kind: "interval", everyMs: 60_000 },
  enabled: true,
  inputs: { branch: "main" },
  missedRunPolicy: "skip",
};

describe("schedule persistence and calculation", () => {
  it("supports CRUD and recomputes next runs on mutation", async () => {
    const { db } = await testDb();
    const now = new Date("2025-01-01T00:00:00.000Z");
    const created = await createSchedule(db, intervalInput, now);
    expect(created.nextRunAt).toBe("2025-01-01T00:01:00.000Z");
    expect(await listSchedules(db)).toHaveLength(1);

    const disabled = await setScheduleEnabled(db, created.id, false, now);
    expect(disabled?.enabled).toBe(false);
    expect(disabled?.nextRunAt).toBeNull();

    const updated = await updateSchedule(
      db,
      created.id,
      { ...intervalInput, spec: { kind: "interval", everyMs: 120_000 } },
      now,
    );
    expect(updated?.nextRunAt).toBe("2025-01-01T00:02:00.000Z");
    expect(await deleteSchedule(db, created.id)).toBe(true);
    expect(await getSchedule(db, created.id)).toBeNull();
  });

  it("uses Croner timezone rules across a DST boundary", () => {
    const next = nextOccurrence(
      { kind: "cron", expr: "0 9 * * *", tz: "America/New_York" },
      new Date("2025-03-08T14:00:01.000Z"),
    );
    expect(next?.toISOString()).toBe("2025-03-09T13:00:00.000Z");
    expect(() => initialNextRunAt({ kind: "cron", expr: "not cron" })).toThrow();
  });
});

describe("scheduler lifecycle", () => {
  it("skips missed schedules on boot and runs runOnce schedules once", async () => {
    const { db } = await testDb();
    const now = new Date("2025-01-01T01:00:00.000Z");
    await db.run(
      `INSERT INTO schedules
        (id, workflow_id, spec_json, enabled, inputs_json, next_run_at, last_run_at, missed_run_policy)
       VALUES (?, ?, ?, 1, ?, ?, NULL, ?)`,
      [
        "skip-me",
        "workflow-1",
        JSON.stringify({ kind: "interval", everyMs: 60_000 }),
        "{}",
        "2025-01-01T00:30:00.000Z",
        "skip",
      ],
    );
    await db.run(
      `INSERT INTO schedules
        (id, workflow_id, spec_json, enabled, inputs_json, next_run_at, last_run_at, missed_run_policy)
       VALUES (?, ?, ?, 1, ?, ?, NULL, ?)`,
      [
        "run-me",
        "workflow-1",
        JSON.stringify({ kind: "once", at: "2025-01-01T00:45:00.000Z" }),
        JSON.stringify({ source: "test" }),
        "2025-01-01T00:45:00.000Z",
        "runOnce",
      ],
    );

    const enqueued: string[] = [];
    const ok: DependencyCheckResult = { ok: true, items: [] };
    const engine: ScheduleEngine = {
      checkDependencies: async () => ok,
      enqueueWorkflow: async (_workflowId, _inputs, context) => {
        enqueued.push(context.scheduleId);
      },
    };
    const scheduler = new WorkflowScheduler(db, engine, { now: () => now });
    await scheduler.start();
    scheduler.stop();

    expect(enqueued).toEqual(["run-me"]);
    expect((await getSchedule(db, "skip-me"))?.nextRunAt).toBe("2025-01-01T01:01:00.000Z");
    const once = await getSchedule(db, "run-me");
    expect(once?.enabled).toBe(false);
    expect(once?.lastRunAt).toBe(now.toISOString());
  });

  it("advances schedules when dependency checks fail", async () => {
    const { db } = await testDb();
    const now = new Date("2025-01-01T00:02:00.000Z");
    const schedule = await createSchedule(
      db,
      { ...intervalInput, missedRunPolicy: "runOnce" },
      new Date("2025-01-01T00:00:00.000Z"),
    );
    const engine: ScheduleEngine = {
      checkDependencies: async () => ({
        ok: false,
        items: [
          {
            stepId: "step",
            kind: "agent",
            name: "codex",
            status: "missing",
            expectedLocation: "PATH",
          },
        ],
      }),
      enqueueWorkflow: async () => {
        throw new Error("must not enqueue");
      },
    };
    const scheduler = new WorkflowScheduler(db, engine, { now: () => now, onError: () => {} });
    await scheduler.processDue();
    expect((await getSchedule(db, schedule.id))?.nextRunAt).toBe("2025-01-01T00:03:00.000Z");
  });
});

describe("job retention", () => {
  it("deletes expired parent runs but preserves each workflow's newest run", async () => {
    const { db, root } = await testDb();
    const logsRoot = join(root, "logs");
    await db.run(
      "INSERT INTO settings (key, value_json) VALUES (?, ?)",
      ["app", JSON.stringify({ jobRetentionDays: 30 })],
    );
    const jobs = [
      ["old", "2024-01-01T00:00:00.000Z"],
      ["newest", "2024-01-02T00:00:00.000Z"],
    ] as const;
    for (const [id, queuedAt] of jobs) {
      await db.run(
        `INSERT INTO jobs
          (id, workflow_id, parent_job_id, step_id, state, attempt, input_json, queued_at, ended_at)
         VALUES (?, 'workflow-1', NULL, NULL, 'succeeded', 1, '{}', ?, ?)`,
        [id, queuedAt, queuedAt],
      );
      await mkdir(join(logsRoot, id), { recursive: true });
      await writeFile(join(logsRoot, id, "stdout.log"), id);
    }

    const result = await runRetentionSweep(db, logsRoot, new Date("2025-02-15T00:00:00.000Z"));
    expect(result.deletedJobIds).toEqual(["old"]);
    expect(await db.get("SELECT id FROM jobs WHERE id = 'old'")).toBeNull();
    expect(await db.get("SELECT id FROM jobs WHERE id = 'newest'")).not.toBeNull();

    const service = new JobRetentionService(db, logsRoot, {
      now: () => new Date("2025-02-15T00:00:00.000Z"),
      intervalMs: 60_000,
    });
    expect(await service.sweep()).not.toBeNull();
    service.stop();
  });
});
