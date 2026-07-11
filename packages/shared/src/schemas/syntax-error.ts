import { z } from "zod";

export const SyntaxErrorDetailSchema = z.object({
  format: z.enum(["json", "toml", "yaml"]),
  message: z.string(),
  line: z.number().int().nullable(),
  column: z.number().int().nullable(),
});
export type SyntaxErrorDetail = z.infer<typeof SyntaxErrorDetailSchema>;
