import { z } from "zod";
import { InstructionResourceSchema } from "./resource";

export const InstructionSchema = InstructionResourceSchema.shape.instruction;
export type Instruction = z.infer<typeof InstructionSchema>;

export const InstructionListSchema = z.array(InstructionResourceSchema);
export type InstructionList = z.infer<typeof InstructionListSchema>;
