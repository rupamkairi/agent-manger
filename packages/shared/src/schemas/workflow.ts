import { z } from "zod";
import { AgentIdSchema } from "./agent";

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(1),
  backoffMs: z.number().int().min(0).default(5_000),
  backoffMultiplier: z.number().min(1).default(2),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WorkflowInputSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});
export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  agentId: AgentIdSchema,
  requiredSkills: z.array(z.string()).default([]),
  requiredInstructions: z.array(z.string()).default([]),
  requiredConfigs: z.array(z.string()).default([]),
  after: z.array(z.string()).default([]),
  prompt: z.string().min(1),
  inputBindings: z.record(z.string(), z.string()).default({}),
  outputCapture: z.enum(["stdout", "lastLine", "jsonBlock"]).default("stdout"),
  timeoutMs: z.number().int().positive().optional(),
  retry: RetryPolicySchema.default({
    maxAttempts: 1,
    backoffMs: 5_000,
    backoffMultiplier: 2,
  }),
  continueOnFailure: z.boolean().default(false),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

function validateDag(
  definition: { steps: Array<{ id: string; after: string[] }> },
  ctx: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  for (const [index, step] of definition.steps.entries()) {
    if (ids.has(step.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["steps", index, "id"],
        message: `Duplicate step id: ${step.id}`,
      });
    }
    ids.add(step.id);
  }

  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    outgoing.set(id, []);
  }
  for (const [index, step] of definition.steps.entries()) {
    for (const dependency of new Set(step.after)) {
      if (!ids.has(dependency)) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "after"],
          message: `Unknown dependency: ${dependency}`,
        });
        continue;
      }
      if (dependency === step.id) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", index, "after"],
          message: "A step cannot depend on itself",
        });
        continue;
      }
      indegree.set(step.id, (indegree.get(step.id) ?? 0) + 1);
      outgoing.get(dependency)?.push(step.id);
    }
  }

  const ready = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (ready.length > 0) {
    const id = ready.shift()!;
    visited += 1;
    for (const next of outgoing.get(id) ?? []) {
      const degree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, degree);
      if (degree === 0) ready.push(next);
    }
  }
  if (visited !== ids.size) {
    ctx.addIssue({ code: "custom", path: ["steps"], message: "Workflow contains a dependency cycle" });
  }
}

export const WorkflowDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().default(""),
    version: z.number().int().positive().default(1),
    projectPath: z.string().min(1),
    inputs: z.array(WorkflowInputSchema).default([]),
    steps: z.array(WorkflowStepSchema).min(1),
    outputs: z.record(z.string(), z.string()).default({}),
    failurePolicy: z
      .enum(["stopOnFirstFailure", "runIndependentBranches"])
      .default("stopOnFirstFailure"),
    defaultTimeoutMs: z.number().int().positive().default(600_000),
  })
  .superRefine(validateDag);
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowSummarySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;
export const WorkflowSummaryListSchema = z.array(WorkflowSummarySchema);

export const DependencyCheckItemSchema = z.object({
  stepId: z.string(),
  kind: z.enum(["agent", "skill", "instruction", "config"]),
  name: z.string(),
  status: z.enum(["found", "missing"]),
  expectedLocation: z.string(),
  foundAt: z.string().optional(),
});
export type DependencyCheckItem = z.infer<typeof DependencyCheckItemSchema>;

export const DependencyCheckResultSchema = z.object({
  ok: z.boolean(),
  items: z.array(DependencyCheckItemSchema),
});
export type DependencyCheckResult = z.infer<typeof DependencyCheckResultSchema>;

export const WorkflowRunRequestSchema = z.object({ inputs: z.record(z.string(), z.unknown()).default({}) });
export type WorkflowRunRequest = z.infer<typeof WorkflowRunRequestSchema>;
export const WorkflowRunResultSchema = z.object({ jobId: z.string() });

export const JobStateSchema = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);
export type JobState = z.infer<typeof JobStateSchema>;

export const JobSchema = z.object({
  id: z.string(),
  workflowId: z.string().nullable(),
  parentJobId: z.string().nullable(),
  stepId: z.string().nullable(),
  state: JobStateSchema,
  attempt: z.number().int().positive(),
  input: z.record(z.string(), z.unknown()),
  output: z.string().nullable(),
  error: z.string().nullable(),
  logRef: z.string().nullable(),
  queuedAt: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  stepCount: z.number().int().nonnegative().optional(),
  originHost: z.string().nullable().optional(),
});
export type Job = z.infer<typeof JobSchema>;
export const JobListSchema = z.array(JobSchema);

export const JobDetailSchema = JobSchema.extend({
  children: z.array(JobSchema),
  logAvailable: z.boolean().optional(),
});
export type JobDetail = z.infer<typeof JobDetailSchema>;

export const JobLogRefSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  stdoutPath: z.string(),
  stderrPath: z.string(),
  bytes: z.number().int().nonnegative(),
});
export type JobLogRef = z.infer<typeof JobLogRefSchema>;

export const ScheduleSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("once"), at: z.string().datetime() }),
  z.object({ kind: z.literal("interval"), everyMs: z.number().int().min(60_000) }),
  z.object({ kind: z.literal("cron"), expr: z.string().min(1), tz: z.string().optional() }),
]);
export type ScheduleSpec = z.infer<typeof ScheduleSpecSchema>;

export const ScheduleSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  spec: ScheduleSpecSchema,
  enabled: z.boolean(),
  inputs: z.record(z.string(), z.unknown()),
  nextRunAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  missedRunPolicy: z.enum(["skip", "runOnce"]),
  ownerHost: z.string().nullable().optional(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;
export const ScheduleListSchema = z.array(ScheduleSchema);

export const ScheduleWriteSchema = ScheduleSchema.omit({
  id: true,
  nextRunAt: true,
  lastRunAt: true,
});
export type ScheduleWrite = z.infer<typeof ScheduleWriteSchema>;

export const ScheduleEnableSchema = z.object({ enabled: z.boolean() });

export const JobCancelResultSchema = z.object({ job: JobSchema });
export const DeleteResultSchema = z.object({ id: z.string(), deleted: z.literal(true) });
