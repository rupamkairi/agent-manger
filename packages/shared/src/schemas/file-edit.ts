import { z } from "zod";
import { AGENT_IDS, SCOPES } from "../constants";

export const FilePutRequestSchema = z.object({
  content: z.string().max(1024 * 1024),
  ifHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type FilePutRequest = z.infer<typeof FilePutRequestSchema>;

export const FilePutResponseSchema = z.object({
  id: z.string(),
  path: z.string(),
  hash: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  mtime: z.string().nullable(),
});
export type FilePutResponse = z.infer<typeof FilePutResponseSchema>;

export const FileCreateRequestSchema = z
  .object({
    agentId: z.enum(AGENT_IDS),
    scope: z.enum(SCOPES),
    projectId: z.string().optional(),
    path: z.string().min(1),
    content: z.string().max(1024 * 1024).default(""),
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
export type FileCreateRequest = z.infer<typeof FileCreateRequestSchema>;

export const FileDeleteRequestSchema = z.object({
  confirm: z.literal(true),
});
export type FileDeleteRequest = z.infer<typeof FileDeleteRequestSchema>;

export const FileDeleteResponseSchema = z.object({
  deleted: z.literal(true),
});
export type FileDeleteResponse = z.infer<typeof FileDeleteResponseSchema>;
