import type { DependencyCheckResult, Job } from "@weave/shared";
import type { Db } from "../db/client";
import { recoverInterruptedJobs } from "../services/jobs";
import { checkWorkflowDependencies } from "../services/workflow-dependencies";
import { getWorkflow } from "../services/workflows";
import type { WorkflowRuntime } from "./runtime";

export interface WorkflowTriggerContext {
  kind: "manual" | "schedule" | "system";
  scheduleId?: string;
  [key: string]: unknown;
}

export class WorkflowNotFoundError extends Error {}
export class WorkflowDependencyError extends Error {
  constructor(public readonly result: DependencyCheckResult) {
    super("Workflow dependencies are missing");
  }
}

export class WorkflowEngine {
  constructor(private readonly db: Db, private readonly runtime: WorkflowRuntime) {}

  private normalizeInputs(
    workflow: Awaited<ReturnType<typeof getWorkflow>> & {},
    inputs: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved = Object.fromEntries(
      workflow.inputs.filter((input) => input.default !== undefined).map((input) => [input.key, input.default]),
    );
    Object.assign(resolved, inputs);
    const missing = workflow.inputs.filter((input) => input.required && resolved[input.key] === undefined);
    if (missing.length > 0) throw new Error(`Required workflow inputs are missing: ${missing.map((input) => input.key).join(", ")}`);
    return resolved;
  }

  async recoverOrphanedJobs(): Promise<number> { return recoverInterruptedJobs(this.db); }

  async checkDependencies(
    workflowId: string,
    _inputs: Record<string, unknown> = {},
  ): Promise<DependencyCheckResult> {
    const workflow = await getWorkflow(this.db, workflowId);
    if (!workflow) throw new WorkflowNotFoundError(`Workflow not found: ${workflowId}`);
    this.normalizeInputs(workflow, _inputs);
    return checkWorkflowDependencies(this.db, workflow);
  }

  async enqueueWorkflow(
    workflowId: string,
    inputs: Record<string, unknown> = {},
    trigger: WorkflowTriggerContext = { kind: "system" },
  ): Promise<Job> {
    const workflow = await getWorkflow(this.db, workflowId);
    if (!workflow) throw new WorkflowNotFoundError(`Workflow not found: ${workflowId}`);
    const resolvedInputs = this.normalizeInputs(workflow, inputs);
    const check = await checkWorkflowDependencies(this.db, workflow);
    if (!check.ok) throw new WorkflowDependencyError(check);
    return this.runtime.queue.enqueue(workflow, resolvedInputs, trigger);
  }
}
