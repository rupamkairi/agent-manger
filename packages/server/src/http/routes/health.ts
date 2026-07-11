import { AgentIdSchema, HealthSeveritySchema, HealthSummarySchema, ScopeSchema } from "@weave/shared";
import { z } from "zod";
import { getHealthSummary } from "../../services/health";
import { ok } from "../respond";
import { validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const healthQuerySchema = z.object({
  severity: HealthSeveritySchema.optional(),
  scope: ScopeSchema.optional(),
  projectId: z.string().optional(),
  agentId: AgentIdSchema.optional(),
});

export const registerHealthRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/health", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, healthQuerySchema));
    return ok(await getHealthSummary(db, filters), HealthSummarySchema);
  });
};
