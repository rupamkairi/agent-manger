import type {
  AgentInfo,
  DependencyCheckResult,
  HealthSummary,
  InstructionResource,
  Project,
  ResourceContent,
  SkillResource,
  SkillStatus,
  WorkflowSummary,
} from "./types";

export class HarborApiError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HarborApiError";
    this.code = code;
    this.details = details;
  }
}

export class HarborUnreachableError extends Error {
  constructor(url: string) {
    super(`Harbor server is not running at ${url} — start it with \`harbor serve\``);
    this.name = "HarborUnreachableError";
  }
}

interface ApiOkEnvelope<T> {
  ok: true;
  data: T;
}

interface ApiErrorEnvelope {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiEnvelope<T> = ApiOkEnvelope<T> | ApiErrorEnvelope;

export interface ListSkillsFilters {
  scope?: string;
  agentId?: string;
  projectId?: string;
  status?: string;
}

export interface ListInstructionsFilters {
  scope?: string;
  projectId?: string;
}

export interface HealthFilters {
  projectId?: string;
  severity?: string;
}

export class HarborClient {
  readonly baseUrl: string;

  constructor(options?: { url?: string }) {
    this.baseUrl = (options?.url ?? process.env.HARBOR_URL ?? "http://localhost:11123").replace(/\/$/, "");
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      throw new HarborUnreachableError(this.baseUrl);
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new HarborApiError("internal", `Failed to parse response from ${url}`);
    }

    if (!envelope.ok) {
      throw new HarborApiError(envelope.error.code, envelope.error.message, envelope.error.details);
    }
    return envelope.data;
  }

  listProjects(): Promise<Project[]> {
    return this.fetchJson("/api/v1/projects");
  }

  listAgents(): Promise<AgentInfo[]> {
    return this.fetchJson("/api/v1/agents");
  }

  listSkills(filters?: ListSkillsFilters): Promise<SkillResource[]> {
    const query = new URLSearchParams();
    if (filters?.scope) query.set("scope", filters.scope);
    if (filters?.agentId) query.set("agentId", filters.agentId);
    if (filters?.projectId) query.set("projectId", filters.projectId);
    if (filters?.status) query.set("status", filters.status);
    const qs = query.toString();
    return this.fetchJson(`/api/v1/skills${qs ? `?${qs}` : ""}`);
  }

  getSkill(resourceId: string): Promise<SkillResource> {
    return this.fetchJson(`/api/v1/skills/${encodeURIComponent(resourceId)}`);
  }

  getResourceContent(resourceId: string): Promise<ResourceContent> {
    return this.fetchJson(`/api/v1/resources/${encodeURIComponent(resourceId)}/content`);
  }

  listInstructions(filters?: ListInstructionsFilters): Promise<InstructionResource[]> {
    const query = new URLSearchParams();
    if (filters?.scope) query.set("scope", filters.scope);
    if (filters?.projectId) query.set("projectId", filters.projectId);
    const qs = query.toString();
    return this.fetchJson(`/api/v1/instructions${qs ? `?${qs}` : ""}`);
  }

  getHealthSummary(filters?: HealthFilters): Promise<HealthSummary> {
    const query = new URLSearchParams();
    if (filters?.projectId) query.set("projectId", filters.projectId);
    if (filters?.severity) query.set("severity", filters.severity);
    const qs = query.toString();
    return this.fetchJson(`/api/v1/health${qs ? `?${qs}` : ""}`);
  }

  listWorkflows(): Promise<WorkflowSummary[]> {
    return this.fetchJson("/api/v1/workflows");
  }

  getWorkflowStepCount(workflowId: string): Promise<number> {
    return this.fetchJson<{ steps: unknown[] }>(`/api/v1/workflows/${encodeURIComponent(workflowId)}`).then(
      (workflow) => workflow.steps.length,
    );
  }

  checkWorkflowDependencies(workflowId: string): Promise<DependencyCheckResult> {
    return this.fetchJson(`/api/v1/workflows/${encodeURIComponent(workflowId)}/check`, { method: "POST" });
  }
}

export interface ToolTextResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

/**
 * Wraps a tool handler so HarborApiError and HarborUnreachableError become
 * a plain-text error result instead of throwing across the MCP transport.
 */
export function wrapTool<Args extends unknown[]>(
  handler: (...args: Args) => Promise<unknown>,
): (...args: Args) => Promise<ToolTextResult> {
  return async (...args: Args) => {
    try {
      const data = await handler(...args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      if (error instanceof HarborApiError || error instanceof HarborUnreachableError) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      throw error;
    }
  };
}

export type { SkillStatus };
