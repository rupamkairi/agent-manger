import type { Scope } from "@weave/shared";
import type { z } from "zod";

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Request body is not valid JSON", null);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError("Request body validation failed", result.error.issues);
  }
  return result.data;
}

export function validateQuery<T extends z.ZodType>(
  query: URLSearchParams,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(Object.fromEntries(query.entries()));
  if (!result.success) {
    throw new ValidationError("Query validation failed", result.error.issues);
  }
  return result.data;
}

/**
 * Resource scope is always either global or one concrete tracked project.
 * Keeping this check shared between route families prevents accidental
 * aggregation across every project when a caller omits projectId.
 */
export function validateScopeSelection<T extends { scope?: Scope; projectId?: string }>(
  value: T,
): T & { scope: Scope } {
  const scope = value.scope ?? "global";
  if (scope === "project" && !value.projectId) {
    throw new ValidationError("projectId is required when scope is project", null);
  }
  if (scope === "global" && value.projectId) {
    throw new ValidationError("projectId is only valid when scope is project", null);
  }
  return { ...value, scope };
}
