import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WeaveClient, wrapTool } from "./api-client";
import type { SkillResource, WorkflowListSummary, SkillSummary } from "./types";

function toSkillSummary(resource: SkillResource): SkillSummary {
  return {
    id: resource.id,
    name: resource.skill.name,
    status: resource.skill.status,
    agentId: resource.agentId,
    scope: resource.scope,
    path: resource.path,
    issueCount: resource.skill.issues.length,
  };
}

const MAX_INSTRUCTION_BYTES = 100 * 1024;

const listSkillsInputSchema = {
  scope: z.enum(["global", "project"]).optional(),
  agentId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(["valid", "warning", "invalid", "unknown"]).optional(),
};

const resourceHealthInputSchema = {
  projectId: z.string().optional(),
  severity: z.enum(["info", "warning", "error", "unknown"]).optional(),
};

export async function runMcpServer(options?: { url?: string }): Promise<void> {
  const client = new WeaveClient(options);
  const server = new McpServer({ name: "weave", version: "0.1.0" });

  // The MCP SDK's own nested zod dependency is hoisted independently by Bun and lands on
  // a different major version than the zod v3 we declare in package.json (this monorepo
  // mixes zod v3 and v4 across packages). The two ZodType instances are runtime-identical
  // (both zod v3 classic) but TS treats them as structurally distinct classes, which blows
  // up multi-key raw-shape inference past the compiler's instantiation depth limit. This
  // untyped alias is a deliberate, narrowly-scoped escape hatch around that cross-instance
  // type mismatch; the schemas themselves are still real zod schemas and validate normally.
  const registerTool: (name: string, config: unknown, cb: (...args: any[]) => Promise<unknown>) => void =
    server.registerTool.bind(server) as any;

  registerTool(
    "list_projects",
    { description: "List all projects registered with Weave." },
    wrapTool(async () => client.listProjects()),
  );

  registerTool(
    "list_agents",
    { description: "List all supported coding agents with their detection state and resource counts." },
    wrapTool(async () => client.listAgents()),
  );

  registerTool(
    "list_skills",
    {
      description: "List skill resources as compact summaries, optionally filtered by scope, agent, project, or status.",
      inputSchema: listSkillsInputSchema,
    },
    wrapTool(async (args: { scope?: string; agentId?: string; projectId?: string; status?: string }) => {
      const skills = await client.listSkills(args);
      return skills.map(toSkillSummary);
    }),
  );

  registerTool(
    "get_skill",
    {
      description: "Get a single skill's full detail plus its SKILL.md content.",
      inputSchema: { resourceId: z.string() },
    },
    wrapTool(async ({ resourceId }: { resourceId: string }) => {
      const [skill, content] = await Promise.all([
        client.getSkill(resourceId),
        client.getResourceContent(resourceId),
      ]);
      return { skill, content };
    }),
  );

  registerTool(
    "get_project_instructions",
    {
      description: "Get all project-scope instruction files for a project, with their content.",
      inputSchema: { projectId: z.string() },
    },
    wrapTool(async ({ projectId }: { projectId: string }) => {
      const instructions = await client.listInstructions({ scope: "project", projectId });
      const results = await Promise.all(
        instructions.map(async (resource) => {
          if (resource.sizeBytes !== null && resource.sizeBytes > MAX_INSTRUCTION_BYTES) {
            return { path: resource.path, content: null, note: "skipped: file exceeds 100KB" };
          }
          const content = await client.getResourceContent(resource.id);
          return { path: resource.path, content: content.content };
        }),
      );
      return results;
    }),
  );

  registerTool(
    "resource_health",
    {
      description: "Get a summary of resource health issues, optionally filtered by project or severity.",
      inputSchema: resourceHealthInputSchema,
    },
    wrapTool(async (args: { projectId?: string; severity?: string }) => client.getHealthSummary(args)),
  );

  registerTool(
    "list_workflows",
    { description: "List all workflows as compact summaries with their step counts." },
    wrapTool(async (): Promise<WorkflowListSummary[]> => {
      const workflows = await client.listWorkflows();
      return Promise.all(
        workflows.map(async (workflow) => ({
          id: workflow.id,
          name: workflow.name,
          version: workflow.version,
          stepCount: await client.getWorkflowStepCount(workflow.id),
        })),
      );
    }),
  );

  registerTool(
    "check_workflow_dependencies",
    {
      description: "Check whether a workflow's required agents, skills, instructions, and configs are all present.",
      inputSchema: { workflowId: z.string() },
    },
    wrapTool(async ({ workflowId }: { workflowId: string }) => client.checkWorkflowDependencies(workflowId)),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
