import { z } from "zod";
import { SCOPES } from "../constants";
import { AgentIdSchema } from "./agent";
import { SkillSchema } from "./skill";

export const ScopeSchema = z.enum(SCOPES);

const resourceBase = {
  id: z.string(),
  path: z.string(),
  originalPath: z.string(),
  isSymlink: z.boolean(),
  symlinkBroken: z.boolean(),
  scope: ScopeSchema,
  projectId: z.string().nullable(),
  agentId: AgentIdSchema,
  sizeBytes: z.number().nullable(),
  mtime: z.string().nullable(),
  lastScannedAt: z.string(),
};

export const SkillResourceSchema = z.object({
  ...resourceBase,
  kind: z.literal("skill"),
  skill: SkillSchema,
});

export const InstructionResourceSchema = z.object({
  ...resourceBase,
  kind: z.literal("instruction"),
  instruction: z.object({
    fileName: z.string(),
    isEmpty: z.boolean(),
  }),
});

export const MemoryResourceSchema = z.object({
  ...resourceBase,
  kind: z.literal("memory"),
  memory: z.object({
    fileName: z.string(),
    isEmpty: z.boolean(),
  }),
});

export const ConfigResourceSchema = z.object({
  ...resourceBase,
  kind: z.literal("config"),
  config: z.object({
    fileName: z.string(),
    format: z.enum(["json", "toml", "markdown", "other"]),
    isEmpty: z.boolean(),
  }),
});

export const ResourceRecordSchema = z.discriminatedUnion("kind", [
  SkillResourceSchema,
  InstructionResourceSchema,
  MemoryResourceSchema,
  ConfigResourceSchema,
]);

export type SkillResource = z.infer<typeof SkillResourceSchema>;
export type InstructionResource = z.infer<typeof InstructionResourceSchema>;
export type MemoryResource = z.infer<typeof MemoryResourceSchema>;
export type ConfigResource = z.infer<typeof ConfigResourceSchema>;
export type ResourceRecord = z.infer<typeof ResourceRecordSchema>;

export const ResourceListSchema = z.array(ResourceRecordSchema);
export const SkillListSchema = z.array(SkillResourceSchema);
