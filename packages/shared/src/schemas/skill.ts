import { z } from "zod";

export const SkillStatusSchema = z.enum(["valid", "warning", "invalid", "unknown"]);
export type SkillStatus = z.infer<typeof SkillStatusSchema>;

export const SkillIssueCodeSchema = z.enum([
  "missing-skill-md",
  "missing-name",
  "missing-description",
  "referenced-file-missing",
  "duplicate-name",
  "broken-symlink",
  "unknown-metadata-field",
  "frontmatter-parse-error",
]);
export type SkillIssueCode = z.infer<typeof SkillIssueCodeSchema>;

export const SkillValidationIssueSchema = z.object({
  code: SkillIssueCodeSchema,
  severity: z.enum(["warning", "error"]),
  message: z.string(),
  file: z.string().nullable(),
});
export type SkillValidationIssue = z.infer<typeof SkillValidationIssueSchema>;

export const SkillSchema = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
  dirName: z.string(),
  status: SkillStatusSchema,
  issues: z.array(SkillValidationIssueSchema),
  files: z.array(z.string()),
});
export type Skill = z.infer<typeof SkillSchema>;
