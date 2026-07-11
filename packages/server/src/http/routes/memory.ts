import {
  AgentIdSchema,
  FileCreateRequestSchema,
  FileDeleteRequestSchema,
  FileDeleteResponseSchema,
  FilePutRequestSchema,
  FilePutResponseSchema,
  MemoryListSchema,
  ScopeSchema,
} from "@weave/shared";
import { z } from "zod";
import { listResourcesByKind } from "../../services/resources";
import {
  createResourceFile,
  deleteResourceFile,
  FileWriteError,
  putResourceFile,
} from "../../services/file-write";
import { err, ok } from "../respond";
import { validateBody, validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const memoryQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  agentId: AgentIdSchema.optional(),
  projectId: z.string().optional(),
});

function mapFileWriteError(error: FileWriteError) {
  const status = error.kind === "conflict" ? 409 : error.kind === "not_found" ? 404 : 400;
  return err(error.kind, error.message, status, error.details);
}

export const registerMemoryRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/memory", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, memoryQuerySchema));
    return ok(await listResourcesByKind(db, "memory", filters), MemoryListSchema);
  });

  router.put("/api/v1/memory/:id", async ({ request, params }) => {
    const body = await validateBody(request, FilePutRequestSchema);
    try {
      const result = await putResourceFile(db, { id: params.id!, kind: "memory", ...body });
      return ok(result, FilePutResponseSchema);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });

  router.post("/api/v1/memory", async ({ request }) => {
    const body = await validateBody(request, FileCreateRequestSchema);
    try {
      const result = await createResourceFile(db, { ...body, kind: "memory" });
      return ok(result, FilePutResponseSchema, 201);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });

  router.delete("/api/v1/memory/:id", async ({ request, params }) => {
    await validateBody(request, FileDeleteRequestSchema);
    try {
      await deleteResourceFile(db, { id: params.id!, kind: "memory" });
      return ok({ deleted: true }, FileDeleteResponseSchema);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });
};
