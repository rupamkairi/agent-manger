import { z } from "zod";

export const ResourceContentSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.string().nullable(),
  truncated: z.boolean(),
  sizeBytes: z.number().int().nullable(),
  hash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export type ResourceContent = z.infer<typeof ResourceContentSchema>;
