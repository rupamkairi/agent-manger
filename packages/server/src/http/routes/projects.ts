import {
  AddProjectRequestSchema,
  GlobalScanResultSchema,
  ProjectListSchema,
  ProjectRescanResultSchema,
  ProjectSchema,
  ProjectSettingsPatchSchema,
  ProjectSettingsSchema,
  RemovedResultSchema,
} from "@weave/shared";
import { scanGlobal } from "../../scanner/scan";
import {
  addProject,
  getProject,
  listProjects,
  ProjectValidationError,
  removeProject,
  rescanProject,
} from "../../services/projects";
import { getProjectSettings, putProjectSettings } from "../../services/project-settings";
import { err, ok } from "../respond";
import { validateBody } from "../validate";
import type { RegisterRoutes } from "./types";

export const registerProjectRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/projects", async () => ok(await listProjects(db), ProjectListSchema));

  router.post("/api/v1/projects", async ({ request }) => {
    const body = await validateBody(request, AddProjectRequestSchema);
    try {
      const project = await addProject(db, body);
      return ok(project, ProjectSchema, 201);
    } catch (error) {
      if (error instanceof ProjectValidationError) {
        const status = error.kind === "conflict" ? 409 : 400;
        return err(error.kind, error.message, status);
      }
      throw error;
    }
  });

  router.get("/api/v1/projects/:id", async ({ params }) => {
    const project = await getProject(db, params.id!);
    if (!project) return err("not_found", `Project not found: ${params.id}`, 404);
    return ok(project, ProjectSchema);
  });

  router.delete("/api/v1/projects/:id", async ({ params }) => {
    const removed = await removeProject(db, params.id!);
    if (!removed) return err("not_found", `Project not found: ${params.id}`, 404);
    return ok({ removed: true }, RemovedResultSchema);
  });

  router.post("/api/v1/projects/:id/rescan", async ({ params }) => {
    const result = await rescanProject(db, params.id!);
    if (!result) return err("not_found", `Project not found: ${params.id}`, 404);
    return ok(result, ProjectRescanResultSchema);
  });

  router.post("/api/v1/scan/global", async () => {
    const resourceCount = await scanGlobal(db);
    return ok({ resourceCount }, GlobalScanResultSchema);
  });

  router.get("/api/v1/projects/:id/settings", async ({ params }) => {
    const settings = await getProjectSettings(db, params.id!);
    if (!settings) return err("not_found", `Project not found: ${params.id}`, 404);
    return ok(settings, ProjectSettingsSchema);
  });

  router.put("/api/v1/projects/:id/settings", async ({ request, params }) => {
    const body = await validateBody(request, ProjectSettingsPatchSchema);
    const settings = await putProjectSettings(db, params.id!, body);
    if (!settings) return err("not_found", `Project not found: ${params.id}`, 404);
    return ok(settings, ProjectSettingsSchema);
  });
};
