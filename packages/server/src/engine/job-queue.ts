import type { Job, WorkflowDefinition } from "@weave/shared";
import type { Db } from "../db/client";
import { getJob, insertJob, patchJob } from "../services/jobs";
import { getSettings } from "../services/settings";
import type { WorkflowEvents } from "./events";
import type { WorkflowRunner } from "./workflow-runner";

interface QueueItem { jobId: string; workflow: WorkflowDefinition; inputs: Record<string, unknown> }

export class JobQueue {
  private readonly pending: QueueItem[] = [];
  private readonly controllers = new Map<string, AbortController>();
  private running = 0;
  private pumping = false;

  constructor(private readonly db: Db, private readonly runner: WorkflowRunner, private readonly events: WorkflowEvents) {}

  async enqueue(
    workflow: WorkflowDefinition,
    inputs: Record<string, unknown>,
    trigger?: Record<string, unknown>,
  ): Promise<Job> {
    const now = new Date().toISOString();
    const job: Job = {
      id: crypto.randomUUID(), workflowId: workflow.id, parentJobId: null, stepId: null, state: "queued",
      attempt: 1, input: trigger ? { ...inputs, _trigger: trigger } : inputs,
      output: null, error: null, logRef: null, queuedAt: now, startedAt: null, endedAt: null,
    };
    await insertJob(this.db, job);
    this.pending.push({ jobId: job.id, workflow, inputs });
    this.events.emitState(job);
    queueMicrotask(() => void this.pump());
    return job;
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      const max = (await getSettings(this.db)).maxConcurrentRuns;
      while (this.running < max && this.pending.length > 0) {
        const item = this.pending.shift()!;
        const controller = new AbortController();
        this.controllers.set(item.jobId, controller);
        this.running += 1;
        void this.runner.run(item.jobId, item.workflow, item.inputs, controller.signal).finally(() => {
          this.controllers.delete(item.jobId);
          this.running -= 1;
          void this.pump();
        });
      }
    } finally { this.pumping = false; }
  }

  async cancel(jobId: string): Promise<Job | null> {
    const job = await getJob(this.db, jobId);
    if (!job || job.parentJobId || !["queued", "running"].includes(job.state)) return job;
    const queuedIndex = this.pending.findIndex((item) => item.jobId === jobId);
    if (queuedIndex >= 0) {
      this.pending.splice(queuedIndex, 1);
      const cancelled = await patchJob(this.db, jobId, { state: "cancelled", error: "Cancelled", endedAt: new Date().toISOString() });
      if (cancelled) this.events.emitState(cancelled);
      return cancelled;
    }
    this.controllers.get(jobId)?.abort();
    return job;
  }
}
