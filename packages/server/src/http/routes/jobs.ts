import { JobCancelResultSchema, JobDetailSchema, JobListSchema, JobStateSchema, type Job } from "@weave/shared";
import { z } from "zod";
import { getWorkflowRuntime } from "../../engine/runtime";
import { getJob, getJobDetail, listJobs } from "../../services/jobs";
import { getHostname } from "../../sync/manager";
import { err, ok } from "../respond";
import { validateQuery } from "../validate";
import type { RegisterRoutes } from "./types";

function foreignHostConflict(originHost: string | null | undefined, action: string): Response | null {
  if (originHost == null || originHost === getHostname()) return null;
  return err("conflict", `Job runs on host ${originHost}; ${action} there`, 409);
}

const listQuerySchema = z.object({ workflowId: z.string().optional(), state: JobStateSchema.optional() });
const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const registerJobRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/jobs", async ({ query }) => {
    const filters = validateQuery(query, listQuerySchema);
    return ok(await listJobs(db, filters), JobListSchema);
  });

  router.get("/api/v1/jobs/:id", async ({ params }) => {
    const detail = await getJobDetail(db, params.id!);
    if (!detail) return err("not_found", `Job not found: ${params.id}`, 404);
    const logAvailable = detail.originHost == null || detail.originHost === getHostname();
    return ok({ ...detail, logAvailable }, JobDetailSchema);
  });

  router.post("/api/v1/jobs/:id/cancel", async ({ params }) => {
    const existing = await getJob(db, params.id!);
    if (!existing) return err("not_found", `Job not found: ${params.id}`, 404);
    const hostConflict = foreignHostConflict(existing.originHost, "cancel it");
    if (hostConflict) return hostConflict;
    if (existing.parentJobId) return err("bad_request", "Only workflow parent jobs can be cancelled", 400);
    if (!["queued", "running"].includes(existing.state)) return err("conflict", `Job is already ${existing.state}`, 409);
    const job = await getWorkflowRuntime(db).queue.cancel(existing.id);
    return ok({ job: job ?? existing }, JobCancelResultSchema);
  });

  router.get("/api/v1/jobs/:id/events", async ({ request, params }) => {
    const existing = await getJob(db, params.id!);
    if (!existing) return err("not_found", `Job not found: ${params.id}`, 404);
    const hostConflict = foreignHostConflict(existing.originHost, "watch it");
    if (hostConflict) return hostConflict;
    const runtime = getWorkflowRuntime(db);
    let unsubscribe = () => {};
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const pending: Job[] = [];
        let replaying = true;
        unsubscribe = runtime.events.onState(params.id!, (job) => {
          if (replaying) pending.push(job);
          else controller.enqueue(sse("state", job));
        });
        const snapshot = await getJobDetail(db, params.id!);
        if (snapshot) controller.enqueue(sse("snapshot", snapshot));
        replaying = false;
        for (const job of pending) controller.enqueue(sse("state", job));
        request.signal.addEventListener("abort", () => { unsubscribe(); try { controller.close(); } catch {} }, { once: true });
      },
      cancel() { unsubscribe(); },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  });

  router.get("/api/v1/jobs/:id/logs", async ({ request, params, query }) => {
    const existing = await getJob(db, params.id!);
    if (!existing) return err("not_found", `Job not found: ${params.id}`, 404);
    const hostConflict = foreignHostConflict(existing.originHost, "read logs");
    if (hostConflict) return hostConflict;
    const runtime = getWorkflowRuntime(db);
    const follow = query.get("follow") === "1";
    let unsubscribe = () => {};
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const pending: Array<{ jobId: string; stream: "stdout" | "stderr"; chunk: string; offset: number }> = [];
        let replaying = follow;
        if (follow) {
          unsubscribe = runtime.events.onLog(params.id!, (event) => {
            if (replaying) pending.push(event);
            else controller.enqueue(sse("log", event));
          });
        }
        const replay = await runtime.logs.read(params.id!);
        const highWater = new Map<string, number>();
        for (const event of replay) {
          highWater.set(`${event.jobId}:${event.stream}`, Buffer.byteLength(event.chunk));
          controller.enqueue(sse("log", event));
        }
        if (!follow) { controller.close(); return; }
        replaying = false;
        for (const event of pending) {
          if (event.offset >= (highWater.get(`${event.jobId}:${event.stream}`) ?? 0)) {
            controller.enqueue(sse("log", event));
          }
        }
        request.signal.addEventListener("abort", () => { unsubscribe(); try { controller.close(); } catch {} }, { once: true });
      },
      cancel() { unsubscribe(); },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  });
};
