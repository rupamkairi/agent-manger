import { z } from "zod";
import { AGENT_IDS, SCOPES } from "../constants";

export const InstallTargetSchema = z
  .object({
    agentId: z.enum(AGENT_IDS),
    scope: z.enum(SCOPES),
    projectId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "project" && !value.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "projectId is required when scope is project",
        path: ["projectId"],
      });
    }
    if (value.scope === "global" && value.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "projectId is only valid when scope is project",
        path: ["projectId"],
      });
    }
  });
export type InstallTarget = z.infer<typeof InstallTargetSchema>;

export const TargetResultSchema = z.object({
  target: InstallTargetSchema,
  ok: z.boolean(),
  installedPath: z.string().nullable(),
  error: z.string().nullable(),
});
export type TargetResult = z.infer<typeof TargetResultSchema>;

export const MultiTargetResponseSchema = z.object({
  results: z.array(TargetResultSchema).min(1),
  rescanned: z.boolean(),
});
export type MultiTargetResponse = z.infer<typeof MultiTargetResponseSchema>;
