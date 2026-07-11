import {
  DeleteResultSchema,
  ScheduleEnableSchema,
  ScheduleListSchema,
  ScheduleSchema,
  ScheduleWriteSchema,
} from "@weave/shared";
import type { Db } from "../../db/client";
import type { Router } from "../../router";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  listSchedules,
  ScheduleServiceError,
  setScheduleEnabled,
  updateSchedule,
} from "../../services/schedules";
import { getHostname } from "../../sync/manager";
import { err, ok } from "../respond";
import { validateBody } from "../validate";

export interface ScheduleRouteDeps {
  db: Db;
  scheduler?: { rearm(): Promise<void> | void };
}

function serviceError(error: unknown): Response | null {
  if (!(error instanceof ScheduleServiceError)) return null;
  return err(error.kind, error.message, error.kind === "not_found" ? 404 : 400);
}

// Schedules run only on their owner host; mutating a foreign host's schedule
// from a synced replica would change it out from under the host executing it.
async function foreignHostConflict(db: Db, scheduleId: string): Promise<Response | null> {
  const schedule = await getSchedule(db, scheduleId);
  if (!schedule) return err("not_found", `Schedule not found: ${scheduleId}`, 404);
  if (schedule.ownerHost != null && schedule.ownerHost !== getHostname()) {
    return err(
      "conflict",
      `Schedule is owned by host ${schedule.ownerHost}; modify it there`,
      409,
    );
  }
  return null;
}

export function registerScheduleRoutes(router: Router, deps: ScheduleRouteDeps): void {
  const rearm = async () => {
    await deps.scheduler?.rearm();
  };

  router.get("/api/v1/schedules", async () =>
    ok(await listSchedules(deps.db), ScheduleListSchema),
  );

  router.get("/api/v1/schedules/:id", async ({ params }) => {
    const schedule = await getSchedule(deps.db, params.id!);
    if (!schedule) return err("not_found", `Schedule not found: ${params.id}`, 404);
    return ok(schedule, ScheduleSchema);
  });

  router.post("/api/v1/schedules", async ({ request }) => {
    const body = await validateBody(request, ScheduleWriteSchema);
    try {
      const schedule = await createSchedule(deps.db, body);
      await rearm();
      return ok(schedule, ScheduleSchema, 201);
    } catch (error) {
      const response = serviceError(error);
      if (response) return response;
      throw error;
    }
  });

  router.put("/api/v1/schedules/:id", async ({ request, params }) => {
    const conflict = await foreignHostConflict(deps.db, params.id!);
    if (conflict) return conflict;
    const body = await validateBody(request, ScheduleWriteSchema);
    try {
      const schedule = await updateSchedule(deps.db, params.id!, body);
      if (!schedule) return err("not_found", `Schedule not found: ${params.id}`, 404);
      await rearm();
      return ok(schedule, ScheduleSchema);
    } catch (error) {
      const response = serviceError(error);
      if (response) return response;
      throw error;
    }
  });

  router.patch("/api/v1/schedules/:id/enabled", async ({ request, params }) => {
    const conflict = await foreignHostConflict(deps.db, params.id!);
    if (conflict) return conflict;
    const body = await validateBody(request, ScheduleEnableSchema);
    try {
      const schedule = await setScheduleEnabled(deps.db, params.id!, body.enabled);
      if (!schedule) return err("not_found", `Schedule not found: ${params.id}`, 404);
      await rearm();
      return ok(schedule, ScheduleSchema);
    } catch (error) {
      const response = serviceError(error);
      if (response) return response;
      throw error;
    }
  });

  router.delete("/api/v1/schedules/:id", async ({ params }) => {
    const conflict = await foreignHostConflict(deps.db, params.id!);
    if (conflict) return conflict;
    if (!(await deleteSchedule(deps.db, params.id!))) {
      return err("not_found", `Schedule not found: ${params.id}`, 404);
    }
    await rearm();
    return ok({ id: params.id!, deleted: true }, DeleteResultSchema);
  });
}
