import { z } from "zod";
import { MemoryResourceSchema } from "./resource";

export const MemorySchema = MemoryResourceSchema.shape.memory;
export type Memory = z.infer<typeof MemorySchema>;

export const MemoryListSchema = z.array(MemoryResourceSchema);
export type MemoryList = z.infer<typeof MemoryListSchema>;
