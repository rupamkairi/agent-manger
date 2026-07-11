import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  addedAt: z.string(),
  lastScannedAt: z.string().nullable(),
  exists: z.boolean(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const AddProjectRequestSchema = z.object({
  rootPath: z.string().min(1),
  name: z.string().min(1).optional(),
});
export type AddProjectRequest = z.infer<typeof AddProjectRequestSchema>;

export const ProjectListSchema = z.array(ProjectSchema);
export type ProjectList = z.infer<typeof ProjectListSchema>;

export const ProjectRescanResultSchema = z.object({
  project: ProjectSchema,
  resourceCount: z.number().int().nonnegative(),
});
export type ProjectRescanResult = z.infer<typeof ProjectRescanResultSchema>;

export const GlobalScanResultSchema = z.object({
  resourceCount: z.number().int().nonnegative(),
});
export type GlobalScanResult = z.infer<typeof GlobalScanResultSchema>;

export const RemovedResultSchema = z.object({ removed: z.literal(true) });
export type RemovedResult = z.infer<typeof RemovedResultSchema>;
