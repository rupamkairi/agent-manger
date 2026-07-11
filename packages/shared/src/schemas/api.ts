import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "bad_request",
  "not_found",
  "conflict",
  "internal",
  "validation_failed",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: ApiErrorSchema,
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export function apiOk<T extends z.ZodType>(data: T) {
  return z.object({ ok: z.literal(true), data });
}

export type ApiOkEnvelope<T> = { ok: true; data: T };
export type ApiEnvelope<T> = ApiOkEnvelope<T> | ApiErrorEnvelope;
