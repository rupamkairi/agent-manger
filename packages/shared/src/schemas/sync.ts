import { z } from "zod";

export const SyncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  syncUrl: z
    .string()
    .refine((url) => /^(https?|libsql):\/\/.+/.test(url), {
      message: "syncUrl must start with http://, https://, or libsql://",
    }),
  authToken: z.string().optional(),
  syncIntervalMs: z.number().int().min(1000).max(3_600_000).default(60_000),
});
export type SyncFileConfig = z.infer<typeof SyncConfigSchema>;

// syncUrl is optional here (unlike SyncConfigSchema) so the disabled-default
// case ({ enabled: false }, no sync.json on disk) has a representable shape.
export const SyncConfigPublicSchema = SyncConfigSchema.omit({ authToken: true, syncUrl: true }).extend({
  syncUrl: z.string().optional(),
  hasAuthToken: z.boolean(),
});
export type SyncConfigPublic = z.infer<typeof SyncConfigPublicSchema>;

export const SyncConfigPutResultSchema = z.object({
  config: SyncConfigPublicSchema,
  restartRequired: z.literal(true),
});
export type SyncConfigPutResult = z.infer<typeof SyncConfigPutResultSchema>;

// Named DbSyncStatus* to avoid clashing with skill-sync's SyncStatus exports.
export const DbSyncStatusSchema = z.object({
  enabled: z.boolean(),
  hostname: z.string(),
  lastSyncAt: z.string().nullable(),
  frameNo: z.number().int().nonnegative().optional(),
  framesSynced: z.number().int().nonnegative().optional(),
  error: z.string().nullable(),
  restartRequired: z.boolean(),
});
export type DbSyncStatus = z.infer<typeof DbSyncStatusSchema>;
