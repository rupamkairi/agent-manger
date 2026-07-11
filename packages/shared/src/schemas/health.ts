import { z } from "zod";
import { AgentIdSchema } from "./agent";

export const HealthSeveritySchema = z.enum(["info", "warning", "error", "unknown"]);
export type HealthSeverity = z.infer<typeof HealthSeveritySchema>;

export const HealthIssueSchema = z.object({
  id: z.string(),
  severity: HealthSeveritySchema,
  source: z.enum(["agent-detection", "skill-validation", "resource-scan", "project"]),
  agentId: AgentIdSchema.nullable(),
  projectId: z.string().nullable(),
  resourceId: z.string().nullable(),
  message: z.string(),
  detectedAt: z.string(),
});
export type HealthIssue = z.infer<typeof HealthIssueSchema>;

export const HealthSummarySchema = z.object({
  counts: z.object({
    info: z.number(),
    warning: z.number(),
    error: z.number(),
    unknown: z.number(),
  }),
  issues: z.array(HealthIssueSchema),
});
export type HealthSummary = z.infer<typeof HealthSummarySchema>;
