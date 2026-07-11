import { z } from "zod";

export const SettingsSchema = z.object({
  scanIgnoreGlobs: z
    .array(z.string())
    .default(["**/node_modules/**", "**/.git/**", "**/dist/**"]),
  detectionTimeoutMs: z.number().int().min(500).max(30000).default(5000),
  maxScanDepth: z.number().int().min(1).max(32).default(12),
  maxConcurrentRuns: z.number().int().min(1).max(16).default(2),
  jobRetentionDays: z.number().int().min(1).max(3650).default(30),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsPatchSchema = SettingsSchema.partial();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
