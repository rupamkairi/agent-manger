import type { Db } from "./db/client";
import { registerAgentRoutes } from "./http/routes/agents";
import { registerConfigRoutes } from "./http/routes/configs";
import { registerHealthRoutes } from "./http/routes/health";
import { registerInstructionRoutes } from "./http/routes/instructions";
import { registerMemoryRoutes } from "./http/routes/memory";
import { registerProjectRoutes } from "./http/routes/projects";
import { registerResourceRoutes } from "./http/routes/resources";
import { registerSettingsRoutes } from "./http/routes/settings";
import { registerSkillRoutes } from "./http/routes/skills";
import { registerWorkflowRoutes } from "./http/routes/workflows";
import { registerJobRoutes } from "./http/routes/jobs";
import { registerScheduleRoutes } from "./http/routes/schedules";
import { registerSyncRoutes } from "./http/routes/sync";
import { registerTerminalRoutes } from "./http/routes/terminal";
import type { RouteDeps } from "./http/routes/types";
import { err } from "./http/respond";
import { ValidationError } from "./http/validate";
import { loadEnv } from "./env";
import { Router } from "./router";
import { serveStatic } from "./static";
import { scanGlobal } from "./scanner/scan";
import { refreshDetection } from "./services/agents";
import { cleanupStaging } from "./services/skill-import";
import { getWorkflowEngine, getWorkflowRuntime } from "./engine/runtime";
import { JobRetentionService, WorkflowScheduler } from "./scheduler";
import type { SyncManager } from "./sync/manager";
import {
  initTerminalManager,
  type TerminalSessionManager,
  type TerminalWsData,
} from "./terminal/session-manager";
import { terminalWebSocketHandler, tryUpgradeTerminal } from "./terminal/ws";

const STAGING_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export interface RouterExtras {
  scheduler?: { rearm(): Promise<void> | void };
  sync?: SyncManager | null;
  weaveHome?: string;
  terminal?: TerminalSessionManager;
}

export function buildRouter(deps: RouteDeps, extras: RouterExtras = {}): Router {
  const router = new Router();
  registerProjectRoutes(router, deps);
  registerAgentRoutes(router, deps);
  registerSkillRoutes(router, deps);
  registerInstructionRoutes(router, deps);
  registerMemoryRoutes(router, deps);
  registerConfigRoutes(router, deps);
  registerResourceRoutes(router, deps);
  registerHealthRoutes(router, deps);
  registerSettingsRoutes(router, deps);
  registerWorkflowRoutes(router, deps);
  registerJobRoutes(router, deps);
  registerScheduleRoutes(router, { ...deps, scheduler: extras.scheduler });
  if (extras.weaveHome) {
    registerSyncRoutes(router, {
      ...deps,
      sync: extras.sync ?? null,
      weaveHome: extras.weaveHome,
    });
  }
  if (extras.terminal) {
    registerTerminalRoutes(router, { ...deps, terminal: extras.terminal });
  }
  return router;
}

export async function initializeServer(db: Db): Promise<void> {
  const attempts = await Promise.allSettled([
    refreshDetection(db),
    scanGlobal(db),
    cleanupStaging(),
    getWorkflowEngine(db).recoverOrphanedJobs(),
  ]);
  const labels = ["agent detection", "global scan", "staging cleanup", "job recovery"];
  for (const [index, attempt] of attempts.entries()) {
    if (attempt.status === "rejected") {
      console.error(`Initial ${labels[index]} failed:`, attempt.reason);
    }
  }
}

export interface ServerOptions {
  port: number;
  headless: boolean;
  sync?: SyncManager | null;
  weaveHome?: string;
}

export interface ServerHandle {
  server: ReturnType<typeof Bun.serve>;
  scheduler: WorkflowScheduler;
  retention: JobRetentionService;
  cleanupInterval: ReturnType<typeof setInterval>;
  terminal: TerminalSessionManager;
}

export async function startServer(db: Db, options: ServerOptions): Promise<ServerHandle> {
  const engine = getWorkflowEngine(db);
  const scheduler = new WorkflowScheduler(db, {
    checkDependencies: (workflowId, inputs) => engine.checkDependencies(workflowId, inputs),
    enqueueWorkflow: (workflowId, inputs, context) =>
      engine.enqueueWorkflow(workflowId, inputs, {
        kind: "schedule",
        scheduleId: context.scheduleId,
      }),
  });
  const retention = new JobRetentionService(db, getWorkflowRuntime(db).logs.root);
  await scheduler.start();
  await retention.start();

  const terminal = await initTerminalManager(db);
  const router = buildRouter(
    { db },
    {
      scheduler,
      sync: options.sync ?? null,
      weaveHome: options.weaveHome ?? loadEnv().weaveHome,
      terminal,
    },
  );

  const cleanupInterval = setInterval(() => {
    cleanupStaging().catch((error) => console.error("Staging cleanup failed:", error));
  }, STAGING_CLEANUP_INTERVAL_MS);
  cleanupInterval.unref?.();

  const server = Bun.serve<TerminalWsData, never>({
    port: options.port,
    websocket: terminalWebSocketHandler(terminal),
    async fetch(request, bunServer) {
      const url = new URL(request.url);

      if (url.pathname === "/ws/terminal") {
        const response = tryUpgradeTerminal(request, url, bunServer, terminal);
        if (response) return response;
        return undefined as unknown as Response;
      }

      if (url.pathname.startsWith("/api")) {
        const match = router.match(request.method, url.pathname);
        if (!match) return err("not_found", "Route not found", 404);
        try {
          return await match.handler({
            request,
            params: match.params,
            query: url.searchParams,
          });
        } catch (error) {
          if (error instanceof ValidationError) {
            return err("validation_failed", error.message, 400, error.details);
          }
          console.error("Unhandled error:", error);
          return err("internal", "Internal server error", 500);
        }
      }

      if (options.headless) {
        return new Response("Weave running in headless mode. API at /api/v1.", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }
      if (request.method === "GET") {
        return serveStatic(url.pathname);
      }
      return new Response("Not found", { status: 404 });
    },
  });

  return { server, scheduler, retention, cleanupInterval, terminal };
}
