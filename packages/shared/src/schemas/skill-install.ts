import { z } from "zod";
import { InstallTargetSchema } from "./write-common";

export const SkillInstallRequestSchema = z.object({
  resourceId: z.string().min(1),
  targets: z.array(InstallTargetSchema).min(1).max(10),
});
export type SkillInstallRequest = z.infer<typeof SkillInstallRequestSchema>;

export const SkillDeleteRequestSchema = z.object({
  resourceId: z.string().min(1),
  confirm: z.literal(true),
});
export type SkillDeleteRequest = z.infer<typeof SkillDeleteRequestSchema>;

export const SkillDeleteResponseSchema = z.object({
  deletedPath: z.string(),
});
export type SkillDeleteResponse = z.infer<typeof SkillDeleteResponseSchema>;
