import { z } from "zod";

export const ConflictTopicSchema = z.enum([
  "package-manager",
  "orm",
  "formatter",
  "indentation",
  "commit-style",
]);
export type ConflictTopic = z.infer<typeof ConflictTopicSchema>;

export const InstructionConflictSchema = z.object({
  topic: ConflictTopicSchema,
  fileA: z.string(),
  fileB: z.string(),
  resourceIdA: z.string(),
  resourceIdB: z.string(),
  valueA: z.string(),
  valueB: z.string(),
  excerptA: z.string().max(300),
  excerptB: z.string().max(300),
  confidence: z.literal("possible"),
});
export type InstructionConflict = z.infer<typeof InstructionConflictSchema>;
