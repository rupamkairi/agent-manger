import { z } from "zod";
import { AGENT_IDS, SCOPES } from "../constants";
import { InstallTargetSchema } from "./write-common";

export const SyncFileStateSchema = z.enum(["same", "modified", "left-only", "right-only"]);
export type SyncFileState = z.infer<typeof SyncFileStateSchema>;

export const SyncStatusSchema = z.enum([
  "identical",
  "left-newer",
  "right-newer",
  "diverged",
  "left-only",
  "right-only",
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const SyncFileDiffSchema = z.object({
  path: z.string(),
  state: SyncFileStateSchema,
  leftHash: z.string().nullable(),
  rightHash: z.string().nullable(),
  leftMtime: z.string().nullable(),
  rightMtime: z.string().nullable(),
});
export type SyncFileDiff = z.infer<typeof SyncFileDiffSchema>;

export const SyncDiffSchema = z.object({
  skillName: z.string(),
  left: InstallTargetSchema,
  right: InstallTargetSchema,
  leftPath: z.string().nullable(),
  rightPath: z.string().nullable(),
  status: SyncStatusSchema,
  files: z.array(SyncFileDiffSchema),
});
export type SyncDiff = z.infer<typeof SyncDiffSchema>;

export const SyncDiffQuerySchema = z.object({
  skillName: z.string().min(1),
  leftAgentId: z.enum(AGENT_IDS),
  leftScope: z.enum(SCOPES),
  leftProjectId: z.string().optional(),
  rightAgentId: z.enum(AGENT_IDS),
  rightScope: z.enum(SCOPES),
  rightProjectId: z.string().optional(),
});
export type SyncDiffQuery = z.infer<typeof SyncDiffQuerySchema>;

export const SyncRequestSchema = z.object({
  skillName: z.string().min(1),
  from: InstallTargetSchema,
  to: InstallTargetSchema,
  confirm: z.literal(true),
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export const SyncResultSchema = z.object({
  copiedFiles: z.number().int().nonnegative(),
  targetPath: z.string(),
});
export type SyncResult = z.infer<typeof SyncResultSchema>;
