import type {
  AgentId,
  DependencyCheckItem,
  DependencyCheckResult,
  WorkflowDefinition,
} from "@weave/shared";
import { basename, join } from "node:path";
import { getAdapter } from "../adapters/registry";
import { resolveGlobalPath, resolveProjectPath } from "../adapters/types";
import type { Db } from "../db/client";

interface IndexedResource {
  kind: "skill" | "instruction" | "config";
  path: string;
  original_path: string;
  scope: "global" | "project";
  project_id: string | null;
  agent_id: AgentId;
  meta_json: string;
}

function resourceName(row: IndexedResource): string[] {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(row.meta_json) as Record<string, unknown>; } catch { /* invalid metadata cannot match */ }
  const skill = meta.skill as { name?: unknown } | undefined;
  const fileName = typeof meta.fileName === "string" ? meta.fileName : undefined;
  return [skill?.name, fileName, row.path, row.original_path, basename(row.path)].filter(
    (value): value is string => typeof value === "string",
  );
}

function expectedLocation(
  workflow: WorkflowDefinition,
  agentId: AgentId,
  kind: DependencyCheckItem["kind"],
  name: string,
): string {
  const adapter = getAdapter(agentId)!;
  if (kind === "agent") return adapter.binaryCandidates.join(" or ");
  const projectPaths = kind === "skill"
    ? adapter.projectSkillRoots.map((path) => join(path, name))
    : kind === "instruction"
      ? adapter.instructionFilePatterns.project
      : adapter.projectConfigPaths;
  if (projectPaths.length > 0) return resolveProjectPath(workflow.projectPath, projectPaths[0]!);
  const globalPaths = kind === "skill"
    ? adapter.globalSkillRoots.map((path) => join(path, name))
    : kind === "instruction"
      ? adapter.instructionFilePatterns.global
      : adapter.globalConfigPaths;
  return globalPaths[0] ? resolveGlobalPath(globalPaths[0]) : `${kind}:${name}`;
}

export async function checkWorkflowDependencies(
  db: Db,
  workflow: WorkflowDefinition,
): Promise<DependencyCheckResult> {
  const project = await db.get<{ id: string }>("SELECT id FROM projects WHERE root_path = ?", [
    workflow.projectPath,
  ]);
  const detections = new Map(
    (await db.all<{ agent_id: string; state: string; binary_path: string | null }>(
      "SELECT agent_id, state, binary_path FROM agent_detections",
    )).map((row) => [row.agent_id, row]),
  );
  const resources = await db.all<IndexedResource>(
    `SELECT kind, path, original_path, scope, project_id, agent_id, meta_json
     FROM resources WHERE kind IN ('skill','instruction','config')`,
  );
  const items: DependencyCheckItem[] = [];

  for (const step of workflow.steps) {
    const detection = detections.get(step.agentId);
    items.push({
      stepId: step.id,
      kind: "agent",
      name: step.agentId,
      status: detection?.state === "installed" ? "found" : "missing",
      expectedLocation: expectedLocation(workflow, step.agentId, "agent", step.agentId),
      ...(detection?.binary_path ? { foundAt: detection.binary_path } : {}),
    });

    const requirements: Array<["skill" | "instruction" | "config", string[]]> = [
      ["skill", step.requiredSkills],
      ["instruction", step.requiredInstructions],
      ["config", step.requiredConfigs],
    ];
    for (const [kind, names] of requirements) {
      for (const name of names) {
        const match = resources.find((row) =>
          row.kind === kind &&
          row.agent_id === step.agentId &&
          (row.scope === "global" || (project && row.project_id === project.id)) &&
          resourceName(row).includes(name)
        );
        items.push({
          stepId: step.id,
          kind,
          name,
          status: match ? "found" : "missing",
          expectedLocation: expectedLocation(workflow, step.agentId, kind, name),
          ...(match ? { foundAt: match.path } : {}),
        });
      }
    }
  }
  return { ok: items.every((item) => item.status === "found"), items };
}
