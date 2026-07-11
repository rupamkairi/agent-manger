import { z } from "zod";
import { AGENT_IDS } from "../constants";

export const AgentIdSchema = z.enum(AGENT_IDS);

export const DetectionStateSchema = z.enum(["installed", "missing", "unknown"]);
export type DetectionState = z.infer<typeof DetectionStateSchema>;

export const AgentDetectionResultSchema = z.object({
  agentId: AgentIdSchema,
  state: DetectionStateSchema,
  binaryPath: z.string().nullable(),
  version: z.string().nullable(),
  detectedAt: z.string(),
  error: z.string().nullable(),
});
export type AgentDetectionResult = z.infer<typeof AgentDetectionResultSchema>;

export const AgentResourceCountsSchema = z.object({
  skills: z.number().int(),
  instructions: z.number().int(),
  memory: z.number().int(),
  configs: z.number().int(),
});
export type AgentResourceCounts = z.infer<typeof AgentResourceCountsSchema>;

export const AgentInfoSchema = z.object({
  id: AgentIdSchema,
  name: z.string(),
  binaryCandidates: z.array(z.string()),
  versionCommand: z.array(z.string()),
  globalConfigPaths: z.array(z.string()),
  projectConfigPaths: z.array(z.string()),
  globalSkillRoots: z.array(z.string()),
  projectSkillRoots: z.array(z.string()),
  instructionFilePatterns: z.object({
    global: z.array(z.string()),
    project: z.array(z.string()),
  }),
  memoryPatterns: z.object({
    global: z.array(z.string()),
    project: z.array(z.string()),
  }),
  supportedCommands: z.array(z.string()),
  detection: AgentDetectionResultSchema.nullable(),
  resourceCounts: AgentResourceCountsSchema,
});
export type AgentInfo = z.infer<typeof AgentInfoSchema>;

export const AgentInfoListSchema = z.array(AgentInfoSchema);
export type AgentInfoList = z.infer<typeof AgentInfoListSchema>;

export const AgentDetectionListSchema = z.array(AgentDetectionResultSchema);
export type AgentDetectionList = z.infer<typeof AgentDetectionListSchema>;
