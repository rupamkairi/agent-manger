import type { Job, WorkflowDefinition, WorkflowStep } from "@weave/shared";
import type { Db } from "../db/client";
import { getJob, insertJob, patchJob } from "../services/jobs";
import type { WorkflowEvents } from "./events";
import type { JobLogStore } from "./log-store";
import { captureOutput, renderTemplate, resolveExpression, type TemplateContext } from "./templates";
import type { StepExecutor } from "./step-executor";

interface StepResult { state: Job["state"]; output: string | null }

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException("Job cancelled", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => { clearTimeout(timer); reject(new DOMException("Job cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
  });
}

export class WorkflowRunner {
  constructor(
    private readonly db: Db,
    private readonly executor: StepExecutor,
    private readonly logs: JobLogStore,
    private readonly events: WorkflowEvents,
  ) {}

  private async update(id: string, patch: Partial<Job>, parentId?: string): Promise<Job> {
    const job = await patchJob(this.db, id, patch);
    if (!job) throw new Error(`Job disappeared: ${id}`);
    this.events.emitState(job);
    if (parentId) this.events.emitState(job, parentId);
    return job;
  }

  private async runStep(
    parentId: string,
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    context: TemplateContext,
    signal: AbortSignal,
  ): Promise<StepResult> {
    const id = crypto.randomUUID();
    const boundInputs = Object.fromEntries(
      Object.entries(step.inputBindings).map(([key, expression]) => [key, resolveExpression(expression, context)]),
    );
    const input = { ...context.inputs, ...boundInputs };
    const queuedAt = new Date().toISOString();
    const job: Job = {
      id, workflowId: workflow.id, parentJobId: parentId, stepId: step.id, state: "queued", attempt: 1,
      input, output: null, error: null, logRef: null, queuedAt, startedAt: null, endedAt: null,
    };
    await insertJob(this.db, job);
    this.events.emitState(job, parentId);
    const log = await this.logs.create(id);
    await this.update(id, { logRef: log.id }, parentId);
    const detection = await this.db.get<{ binary_path: string | null }>(
      "SELECT binary_path FROM agent_detections WHERE agent_id = ? AND state = 'installed'", [step.agentId],
    );
    let lastError = "Step failed";
    for (let attempt = 1; attempt <= step.retry.maxAttempts; attempt += 1) {
      if (signal.aborted) {
        await this.update(id, { state: "cancelled", attempt, error: "Cancelled", endedAt: new Date().toISOString() }, parentId);
        return { state: "cancelled", output: null };
      }
      await this.update(id, { state: "running", attempt, startedAt: new Date().toISOString(), error: null }, parentId);
      try {
        const result = await this.executor.execute({
          jobId: id, agentId: step.agentId, binaryPath: detection?.binary_path,
          prompt: renderTemplate(step.prompt, { inputs: input, steps: context.steps }),
          cwd: workflow.projectPath, timeoutMs: step.timeoutMs ?? workflow.defaultTimeoutMs, signal,
        });
        if (result.timedOut) lastError = `Timed out after ${step.timeoutMs ?? workflow.defaultTimeoutMs}ms`;
        else if (result.exitCode !== 0) lastError = result.stderr.trim() || `Process exited with code ${result.exitCode}`;
        else {
          const captured = captureOutput(result.stdout, step.outputCapture);
          const output = result.stdoutTruncated && step.outputCapture === "stdout"
            ? `[output truncated; full stdout retained in the job log]\n${captured}`
            : captured;
          await this.update(id, { state: "succeeded", output, endedAt: new Date().toISOString() }, parentId);
          return { state: "succeeded", output };
        }
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          await this.update(id, { state: "cancelled", error: "Cancelled", endedAt: new Date().toISOString() }, parentId);
          return { state: "cancelled", output: null };
        }
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt < step.retry.maxAttempts) {
        await this.logs.append(id, "stderr", `\nRetrying after failure: ${lastError}\n`);
        try {
          await sleep(step.retry.backoffMs * step.retry.backoffMultiplier ** (attempt - 1), signal);
        } catch {
          await this.update(id, { state: "cancelled", error: "Cancelled", endedAt: new Date().toISOString() }, parentId);
          return { state: "cancelled", output: null };
        }
      }
    }
    await this.update(id, { state: "failed", error: lastError, endedAt: new Date().toISOString() }, parentId);
    return { state: "failed", output: null };
  }

  private async skipStep(parentId: string, workflowId: string, step: WorkflowStep, reason: string): Promise<void> {
    const now = new Date().toISOString();
    const job: Job = {
      id: crypto.randomUUID(), workflowId, parentJobId: parentId, stepId: step.id, state: "cancelled", attempt: 1,
      input: {}, output: null, error: reason, logRef: null, queuedAt: now, startedAt: null, endedAt: now,
    };
    await insertJob(this.db, job);
    this.events.emitState(job, parentId);
  }

  async run(parentId: string, workflow: WorkflowDefinition, inputs: Record<string, unknown>, signal: AbortSignal): Promise<void> {
    await this.update(parentId, { state: "running", startedAt: new Date().toISOString() });
    const pending = new Map(workflow.steps.map((step) => [step.id, step]));
    const stepsById = new Map(workflow.steps.map((step) => [step.id, step]));
    const results = new Map<string, StepResult>();
    const context: TemplateContext = { inputs, steps: {} };
    try {
      while (pending.size > 0 && !signal.aborted) {
        const ready = [...pending.values()].filter((step) => step.after.every((id) => results.has(id)));
        if (ready.length === 0) throw new Error("Workflow DAG made no progress");
        const runnable: WorkflowStep[] = [];
        for (const step of ready) {
          pending.delete(step.id);
          const failedDependency = step.after.some(
            (id) =>
              results.get(id)?.state !== "succeeded" &&
              !stepsById.get(id)?.continueOnFailure,
          );
          const stopAfterFailure = workflow.failurePolicy === "stopOnFirstFailure" &&
            [...results.entries()].some(
              ([id, result]) => result.state === "failed" && !stepsById.get(id)?.continueOnFailure,
            );
          if (failedDependency || stopAfterFailure) {
            await this.skipStep(parentId, workflow.id, step, "Skipped because a required predecessor failed");
            results.set(step.id, { state: "cancelled", output: null });
          } else runnable.push(step);
        }
        const completed = await Promise.all(runnable.map(async (step) => [step, await this.runStep(parentId, workflow, step, context, signal)] as const));
        for (const [step, result] of completed) {
          results.set(step.id, result);
          context.steps[step.id] = result.output;
        }
      }

      if (signal.aborted) {
        for (const step of pending.values()) await this.skipStep(parentId, workflow.id, step, "Cancelled before execution");
        await this.update(parentId, { state: "cancelled", error: "Cancelled", endedAt: new Date().toISOString() });
        return;
      }
      const failed = [...results.values()].some((result) => result.state === "failed");
      const output = Object.fromEntries(Object.entries(workflow.outputs).map(([key, expression]) => [key, resolveExpression(expression, context)]));
      await this.update(parentId, {
        state: failed ? "failed" : "succeeded", output: failed ? null : JSON.stringify(output),
        error: failed ? "One or more workflow steps failed" : null, endedAt: new Date().toISOString(),
      });
    } catch (error) {
      const cancelled = signal.aborted;
      await this.update(parentId, {
        state: cancelled ? "cancelled" : "failed",
        error: cancelled ? "Cancelled" : error instanceof Error ? error.message : String(error),
        endedAt: new Date().toISOString(),
      });
    }
  }
}
