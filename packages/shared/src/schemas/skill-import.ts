import { z } from "zod";
import { SkillValidationIssueSchema } from "./skill";
import { InstallTargetSchema } from "./write-common";

export const SkillSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("localFolder"), path: z.string().min(1) }),
  z.object({ kind: z.literal("zip"), path: z.string().min(1) }),
  z.object({ kind: z.literal("githubRepo"), url: z.string().min(1), ref: z.string().optional() }),
  z.object({
    kind: z.literal("githubSubfolder"),
    url: z.string().min(1),
    subpath: z.string().min(1),
    ref: z.string().optional(),
  }),
]);
export type SkillSource = z.infer<typeof SkillSourceSchema>;

export const SkillLoadRequestSchema = z.object({
  source: SkillSourceSchema,
});
export type SkillLoadRequest = z.infer<typeof SkillLoadRequestSchema>;

export const SkillLoadResultSchema = z.object({
  stagingId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  files: z.array(z.object({ path: z.string(), size: z.number().int().nonnegative() })),
  issues: z.array(SkillValidationIssueSchema),
  installable: z.boolean(),
  expiresAt: z.string(),
});
export type SkillLoadResult = z.infer<typeof SkillLoadResultSchema>;

export const SkillImportInstallRequestSchema = z.object({
  stagingId: z.string().min(1),
  targets: z.array(InstallTargetSchema).min(1).max(10),
});
export type SkillImportInstallRequest = z.infer<typeof SkillImportInstallRequestSchema>;
