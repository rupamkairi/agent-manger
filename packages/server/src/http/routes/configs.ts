import {
  AgentIdSchema,
  ConfigListSchema,
  FilePutRequestSchema,
  FilePutResponseSchema,
  ScopeSchema,
} from "@weave/shared";
import { z } from "zod";
import { listResourcesByKind } from "../../services/resources";
import { FileWriteError, putResourceFile } from "../../services/file-write";
import { err, ok } from "../respond";
import { validateBody, validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const configQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  agentId: AgentIdSchema.optional(),
  projectId: z.string().optional(),
});

function mapFileWriteError(error: FileWriteError) {
  const status = error.kind === "conflict" ? 409 : error.kind === "not_found" ? 404 : 400;
  return err(error.kind, error.message, status, error.details);
}

export const registerConfigRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/configs", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, configQuerySchema));
    return ok(await listResourcesByKind(db, "config", filters), ConfigListSchema);
  });

  router.put("/api/v1/configs/:id", async ({ request, params }) => {
    const body = await validateBody(request, FilePutRequestSchema);
    try {
      const result = await putResourceFile(db, { id: params.id!, kind: "config", ...body });
      return ok(result, FilePutResponseSchema);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });
};
