import {
  AgentDetectionListSchema,
  AgentDetectionResultSchema,
  AgentIdSchema,
  AgentInfoListSchema,
  AgentInfoSchema,
  ScopeSchema,
} from "@weave/shared";
import { z } from "zod";
import { getAgentInfo, getAgentInfos, refreshDetection } from "../../services/agents";
import { err, ok } from "../respond";
import { validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const agentQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  projectId: z.string().min(1).optional(),
});

export const registerAgentRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/agents", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, agentQuerySchema));
    return ok(await getAgentInfos(db, filters), AgentInfoListSchema);
  });

  router.get("/api/v1/agents/:agentId", async ({ params, query }) => {
    const parsed = AgentIdSchema.safeParse(params.agentId);
    if (!parsed.success) {
      return err("not_found", `Unknown agent: ${params.agentId}`, 404);
    }
    const filters = validateScopeSelection(validateQuery(query, agentQuerySchema));
    const info = await getAgentInfo(db, parsed.data, filters);
    if (!info) {
      return err("not_found", `Unknown agent: ${params.agentId}`, 404);
    }
    return ok(info, AgentInfoSchema);
  });

  router.post("/api/v1/agents/detect", async () =>
    ok(await refreshDetection(db), AgentDetectionListSchema),
  );

  router.post("/api/v1/agents/:agentId/detect", async ({ params }) => {
    const parsed = AgentIdSchema.safeParse(params.agentId);
    if (!parsed.success) {
      return err("not_found", `Unknown agent: ${params.agentId}`, 404);
    }
    const results = await refreshDetection(db, parsed.data);
    if (results.length === 0) {
      return err("not_found", `Unknown agent: ${params.agentId}`, 404);
    }
    return ok(results[0], AgentDetectionResultSchema);
  });
};
