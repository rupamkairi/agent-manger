import { ApiErrorEnvelopeSchema, apiOk, type ApiErrorCode } from "@weave/shared";
import type { z } from "zod";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function ok<T>(data: unknown, schema: z.ZodType<T>, status = 200): Response {
  const envelope = apiOk(schema).parse({ ok: true, data });
  return new Response(JSON.stringify(envelope), {
    status,
    headers: JSON_HEADERS,
  });
}

export function err(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const envelope = ApiErrorEnvelopeSchema.parse({
      ok: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
  return new Response(JSON.stringify(envelope), { status, headers: JSON_HEADERS });
}
