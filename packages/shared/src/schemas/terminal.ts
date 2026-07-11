import { z } from "zod";

export const TerminalSessionSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  cwd: z.string(),
  shell: z.string(),
  pid: z.number().nullable(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
});
export type TerminalSession = z.infer<typeof TerminalSessionSchema>;
export const TerminalSessionListSchema = z.array(TerminalSessionSchema);

export const TerminalSessionCreateSchema = z.object({
  projectId: z.string().nullable(),
});
export type TerminalSessionCreate = z.infer<typeof TerminalSessionCreateSchema>;

export const TerminalAvailabilitySchema = z.object({
  available: z.boolean(),
  provider: z.enum(["bun-pty", "node-pty"]).nullable(),
});
export type TerminalAvailability = z.infer<typeof TerminalAvailabilitySchema>;

export const TerminalClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("input"), data: z.string() }),
  z.object({ type: z.literal("resize"), cols: z.number().int().min(1).max(1000), rows: z.number().int().min(1).max(1000) }),
  z.object({ type: z.literal("ping") }),
]);
export type TerminalClientMessage = z.infer<typeof TerminalClientMessageSchema>;

export type TerminalServerMessage =
  | { type: "ready"; sessionId: string; cols: number; rows: number; replayBytes: number }
  | { type: "exit"; code: number | null }
  | { type: "pong" }
  | { type: "error"; code: string; message: string };
