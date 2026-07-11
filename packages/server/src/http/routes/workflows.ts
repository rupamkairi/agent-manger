import {
  DeleteResultSchema,
  DependencyCheckResultSchema,
  WorkflowDefinitionSchema,
  WorkflowRunRequestSchema,
  WorkflowRunResultSchema,
  WorkflowSummaryListSchema,
} from "@weave/shared";
import { getWorkflowRuntime } from "../../engine/runtime";
import { checkWorkflowDependencies } from "../../services/workflow-dependencies";
import { createWorkflow, deleteWorkflow, getWorkflow, listWorkflows, updateWorkflow } from "../../services/workflows";
import { err, ok } from "../respond";
import { validateBody } from "../validate";
import type { RegisterRoutes } from "./types";

export const registerWorkflowRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/workflows", async () => ok(await listWorkflows(db), WorkflowSummaryListSchema));

  router.get("/api/v1/workflows/:id", async ({ params }) => {
    const workflow = await getWorkflow(db, params.id!);
    return workflow ? ok(workflow, WorkflowDefinitionSchema) : err("not_found", `Workflow not found: ${params.id}`, 404);
  });

  router.post("/api/v1/workflows", async ({ request }) => {
    const body = await validateBody(request, WorkflowDefinitionSchema);
    if (await getWorkflow(db, body.id)) return err("conflict", `Workflow already exists: ${body.id}`, 409);
    return ok(await createWorkflow(db, body), WorkflowDefinitionSchema, 201);
  });

  router.put("/api/v1/workflows/:id", async ({ request, params }) => {
    const body = await validateBody(request, WorkflowDefinitionSchema);
    const workflow = await updateWorkflow(db, params.id!, body);
    return workflow ? ok(workflow, WorkflowDefinitionSchema) : err("not_found", `Workflow not found: ${params.id}`, 404);
  });

  router.delete("/api/v1/workflows/:id", async ({ params }) => {
    const deleted = await deleteWorkflow(db, params.id!);
    return deleted
      ? ok({ id: params.id!, deleted: true as const }, DeleteResultSchema)
      : err("not_found", `Workflow not found: ${params.id}`, 404);
  });

  router.post("/api/v1/workflows/:id/check", async ({ params }) => {
    const workflow = await getWorkflow(db, params.id!);
    if (!workflow) return err("not_found", `Workflow not found: ${params.id}`, 404);
    return ok(await checkWorkflowDependencies(db, workflow), DependencyCheckResultSchema);
  });

  router.post("/api/v1/workflows/:id/run", async ({ request, params }) => {
    const workflow = await getWorkflow(db, params.id!);
    if (!workflow) return err("not_found", `Workflow not found: ${params.id}`, 404);
    const body = await validateBody(request, WorkflowRunRequestSchema);
    const check = await checkWorkflowDependencies(db, workflow);
    if (!check.ok) return err("conflict", "Workflow dependencies are missing", 409, check);
    const missingInputs = workflow.inputs.filter((input) => input.required && body.inputs[input.key] === undefined && input.default === undefined);
    if (missingInputs.length > 0) return err("validation_failed", "Required workflow inputs are missing", 400, missingInputs.map((input) => input.key));
    const inputs = Object.fromEntries(workflow.inputs
      .filter((input) => input.default !== undefined)
      .map((input) => [input.key, input.default]));
    Object.assign(inputs, body.inputs);
    const job = await getWorkflowRuntime(db).queue.enqueue(workflow, inputs, { kind: "manual" });
    return ok({ jobId: job.id }, WorkflowRunResultSchema, 202);
  });
};
