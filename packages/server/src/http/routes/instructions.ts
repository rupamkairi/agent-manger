import {
  AgentIdSchema,
  FileCreateRequestSchema,
  FileDeleteRequestSchema,
  FileDeleteResponseSchema,
  FilePutRequestSchema,
  FilePutResponseSchema,
  InstructionConflictSchema,
  InstructionListSchema,
  ScopeSchema,
} from "@weave/shared";
import { z } from "zod";
import { listResourcesByKind } from "../../services/resources";
import { detectConflicts } from "../../services/instruction-conflicts";
import {
  createResourceFile,
  deleteResourceFile,
  FileWriteError,
  putResourceFile,
} from "../../services/file-write";
import { err, ok } from "../respond";
import { validateBody, validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const instructionQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  agentId: AgentIdSchema.optional(),
  projectId: z.string().optional(),
});

const conflictsQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  projectId: z.string().optional(),
});

function mapFileWriteError(error: FileWriteError) {
  const status =
    error.kind === "conflict" ? 409 : error.kind === "not_found" ? 404 : error.kind === "validation_failed" ? 400 : 400;
  return err(error.kind, error.message, status, error.details);
}

export const registerInstructionRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/instructions", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, instructionQuerySchema));
    return ok(await listResourcesByKind(db, "instruction", filters), InstructionListSchema);
  });

  router.get("/api/v1/instructions/conflicts", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, conflictsQuerySchema));
    const conflicts = await detectConflicts(db, filters);
    return ok(conflicts, z.array(InstructionConflictSchema));
  });

  router.put("/api/v1/instructions/:id", async ({ request, params }) => {
    const body = await validateBody(request, FilePutRequestSchema);
    try {
      const result = await putResourceFile(db, { id: params.id!, kind: "instruction", ...body });
      return ok(result, FilePutResponseSchema);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });

  router.post("/api/v1/instructions", async ({ request }) => {
    const body = await validateBody(request, FileCreateRequestSchema);
    try {
      const result = await createResourceFile(db, { ...body, kind: "instruction" });
      return ok(result, FilePutResponseSchema, 201);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });

  router.delete("/api/v1/instructions/:id", async ({ request, params }) => {
    await validateBody(request, FileDeleteRequestSchema);
    try {
      await deleteResourceFile(db, { id: params.id!, kind: "instruction" });
      return ok({ deleted: true }, FileDeleteResponseSchema);
    } catch (error) {
      if (error instanceof FileWriteError) return mapFileWriteError(error);
      throw error;
    }
  });
};
