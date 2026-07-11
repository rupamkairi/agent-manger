import type { Db } from "../db/client";
import { WorkflowEvents } from "./events";
import { JobQueue } from "./job-queue";
import { JobLogStore } from "./log-store";
import { StepExecutor } from "./step-executor";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowEngine } from "./workflow-engine";

export interface WorkflowRuntime { events: WorkflowEvents; logs: JobLogStore; queue: JobQueue }
const runtimes = new WeakMap<object, WorkflowRuntime>();
const engines = new WeakMap<object, WorkflowEngine>();

export function getWorkflowRuntime(db: Db): WorkflowRuntime {
  const existing = runtimes.get(db as object);
  if (existing) return existing;
  const events = new WorkflowEvents();
  const logs = new JobLogStore(db, events);
  const executor = new StepExecutor(logs);
  const runner = new WorkflowRunner(db, executor, logs, events);
  const runtime = { events, logs, queue: new JobQueue(db, runner, events) };
  runtimes.set(db as object, runtime);
  return runtime;
}

export function getWorkflowEngine(db: Db): WorkflowEngine {
  const existing = engines.get(db as object);
  if (existing) return existing;
  const engine = new WorkflowEngine(db, getWorkflowRuntime(db));
  engines.set(db as object, engine);
  return engine;
}
