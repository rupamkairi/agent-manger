import {
  TerminalAvailabilitySchema,
  TerminalSessionCreateSchema,
  TerminalSessionListSchema,
  TerminalSessionSchema,
} from "@weave/shared";
import { z } from "zod";
import type { Db } from "../../db/client";
import type { Router } from "../../router";
import { TerminalServiceError, type TerminalSessionManager } from "../../terminal/session-manager";
import { err, ok } from "../respond";
import { validateBody } from "../validate";

export interface TerminalRouteDeps {
  db: Db;
  terminal: TerminalSessionManager;
}

const deleteBodySchema = z.object({ confirm: z.literal(true) });
const deleteResultSchema = z.object({ deleted: z.boolean() });

function serviceError(error: unknown): Response | null {
  if (!(error instanceof TerminalServiceError)) return null;
  switch (error.kind) {
    case "not_found":
      return err("not_found", error.message, 404);
    case "limit_exceeded":
      return err("bad_request", error.message, 400);
    case "validation_failed":
      return err("validation_failed", error.message, 400);
    case "unavailable":
      // No dedicated "unavailable" error code exists in the shared API
      // envelope (bad_request/not_found/conflict/internal/validation_failed);
      // "internal" with a 503 status is the closest fit and matches how
      // other routes report backend-unavailable conditions.
      return err("internal", error.message, 503);
  }
}

export function registerTerminalRoutes(router: Router, deps: TerminalRouteDeps): void {
  router.get("/api/v1/terminal/availability", async () =>
    ok(
      { available: deps.terminal.available, provider: deps.terminal.providerName },
      TerminalAvailabilitySchema,
    ),
  );

  router.get("/api/v1/terminal/sessions", async () =>
    ok(deps.terminal.list(), TerminalSessionListSchema),
  );

  router.post("/api/v1/terminal/sessions", async ({ request }) => {
    const body = await validateBody(request, TerminalSessionCreateSchema);
    try {
      const session = await deps.terminal.create(body);
      return ok(session, TerminalSessionSchema, 201);
    } catch (error) {
      const response = serviceError(error);
      if (response) return response;
      throw error;
    }
  });

  router.delete("/api/v1/terminal/sessions/:id", async ({ request, params }) => {
    await validateBody(request, deleteBodySchema);
    const deleted = await deps.terminal.kill(params.id!);
    return ok({ deleted }, deleteResultSchema);
  });
}
