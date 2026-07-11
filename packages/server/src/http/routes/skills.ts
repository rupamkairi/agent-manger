import {
  AgentIdSchema,
  MultiTargetResponseSchema,
  ScopeSchema,
  SkillDeleteResponseSchema,
  SkillImportInstallRequestSchema,
  SkillInstallRequestSchema,
  SkillLoadRequestSchema,
  SkillLoadResultSchema,
  SkillListSchema,
  SkillResourceSchema,
  SkillStatusSchema,
  SyncDiffQuerySchema,
  SyncDiffSchema,
  SyncRequestSchema,
  SyncResultSchema,
} from "@weave/shared";
import { z } from "zod";
import { getResource, listResourcesByKind } from "../../services/resources";
import { deleteSkillCopy, installSkillFromResource } from "../../services/skill-write";
import { installStaged, loadSkill, SkillImportError } from "../../services/skill-import";
import { getSyncDiff, syncSkill } from "../../services/skill-sync";
import { err, ok } from "../respond";
import { validateBody, validateQuery, validateScopeSelection } from "../validate";
import type { RegisterRoutes } from "./types";

const skillQuerySchema = z.object({
  scope: ScopeSchema.optional(),
  agentId: AgentIdSchema.optional(),
  projectId: z.string().optional(),
  status: SkillStatusSchema.optional(),
});

const skillDeleteBodySchema = z.object({
  confirm: z.literal(true),
});

export const registerSkillRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/skills", async ({ query }) => {
    const filters = validateScopeSelection(validateQuery(query, skillQuerySchema));
    return ok(await listResourcesByKind(db, "skill", filters), SkillListSchema);
  });

  router.get("/api/v1/skills/:id", async ({ params }) => {
    const resource = await getResource(db, params.id!);
    if (!resource || resource.kind !== "skill") {
      return err("not_found", `Skill not found: ${params.id}`, 404);
    }
    return ok(resource, SkillResourceSchema);
  });

  router.post("/api/v1/skills/install", async ({ request }) => {
    const body = await validateBody(request, SkillInstallRequestSchema);
    const response = await installSkillFromResource(db, body.resourceId, body.targets);
    if (!response) return err("not_found", `Skill not found: ${body.resourceId}`, 404);
    return ok(response, MultiTargetResponseSchema);
  });

  router.delete("/api/v1/skills/:id", async ({ request, params }) => {
    await validateBody(request, skillDeleteBodySchema);
    const outcome = await deleteSkillCopy(db, params.id!);
    if (!outcome.ok) {
      const status = outcome.code === "not_found" ? 404 : 400;
      return err(outcome.code, outcome.error, status);
    }
    return ok({ deletedPath: outcome.deletedPath }, SkillDeleteResponseSchema);
  });

  router.post("/api/v1/skills/import/load", async ({ request }) => {
    const body = await validateBody(request, SkillLoadRequestSchema);
    try {
      const result = await loadSkill(db, body.source);
      return ok(result, SkillLoadResultSchema);
    } catch (error) {
      if (error instanceof SkillImportError) {
        return err("bad_request", error.message, error.status);
      }
      throw error;
    }
  });

  router.post("/api/v1/skills/import/install", async ({ request }) => {
    const body = await validateBody(request, SkillImportInstallRequestSchema);
    const outcome = await installStaged(db, body);
    if (outcome.status !== "ok") {
      const status = outcome.status === "not_found" ? 404 : 409;
      return err(outcome.status, outcome.message, status);
    }
    return ok(outcome.response, MultiTargetResponseSchema);
  });

  router.get("/api/v1/skills/sync-diff", async ({ query }) => {
    const parsed = validateQuery(query, SyncDiffQuerySchema);
    const diff = await getSyncDiff(db, parsed);
    if (!diff) {
      return err("not_found", `No copies of skill "${parsed.skillName}" found for either side`, 404);
    }
    return ok(diff, SyncDiffSchema);
  });

  router.post("/api/v1/skills/sync", async ({ request }) => {
    const body = await validateBody(request, SyncRequestSchema);
    const outcome = await syncSkill(db, body);
    if (outcome.status !== "ok") {
      const status = outcome.status === "not_found" ? 404 : 400;
      return err(outcome.status, outcome.message, status);
    }
    return ok(outcome.result, SyncResultSchema);
  });
};
