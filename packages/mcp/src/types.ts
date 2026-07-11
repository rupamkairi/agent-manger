import type {
  AgentInfo,
  DependencyCheckResult,
  HealthSummary,
  InstructionResource,
  Project,
  ResourceContent,
  SkillResource,
  SkillStatus,
  WorkflowSummary,
} from "@weave/shared";

export type {
  AgentInfo,
  DependencyCheckResult,
  HealthSummary,
  InstructionResource,
  Project,
  ResourceContent,
  SkillResource,
  SkillStatus,
  WorkflowSummary,
};

/** Compact summary of a skill resource, derived from the full SkillResourceSchema shape. */
export interface SkillSummary {
  id: string;
  name: string | null;
  status: SkillStatus;
  agentId: string;
  scope: string;
  path: string;
  issueCount: number;
}

/** Compact summary of a workflow, derived from WorkflowSummarySchema. */
export interface WorkflowListSummary {
  id: string;
  name: string;
  version: number;
  stepCount: number;
}
