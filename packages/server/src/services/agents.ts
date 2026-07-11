import type {
  AgentDetectionResult,
  AgentId,
  AgentInfo,
  AgentResourceCounts,
  Scope,
} from "@weave/shared";
import { detectAgent, detectAll, persistDetection } from "../adapters/detect";
import { getAdapter, listAdapters } from "../adapters/registry";
import type { AgentAdapter } from "../adapters/types";
import type { Db } from "../db/client";
import { getSettings } from "./settings";

interface DetectionRow {
  agent_id: string;
  state: string;
  binary_path: string | null;
  version: string | null;
  error: string | null;
  detected_at: string;
}

function rowToDetection(row: DetectionRow): AgentDetectionResult {
  return {
    agentId: row.agent_id as AgentId,
    state: row.state as AgentDetectionResult["state"],
    binaryPath: row.binary_path,
    version: row.version,
    detectedAt: row.detected_at,
    error: row.error,
  };
}

export interface AgentFilters {
  scope?: Scope;
  projectId?: string;
}

function normalizeFilters(filters: AgentFilters): { scope: Scope; projectId?: string } {
  const scope = filters.scope ?? "global";
  return scope === "project"
    ? { scope, ...(filters.projectId ? { projectId: filters.projectId } : {}) }
    : { scope };
}

function emptyResourceCounts(): AgentResourceCounts {
  return { skills: 0, instructions: 0, memory: 0, configs: 0 };
}

async function getResourceCounts(
  db: Db,
  filters: AgentFilters,
): Promise<Map<AgentId, AgentResourceCounts>> {
  const normalized = normalizeFilters(filters);
  const clauses = ["scope = ?"];
  const args: (string | null)[] = [normalized.scope];
  if (normalized.projectId) {
    clauses.push("project_id = ?");
    args.push(normalized.projectId);
  }

  const rows = await db.all<{ agent_id: string; kind: string; count: number }>(
    `SELECT agent_id, kind, COUNT(*) as count
     FROM resources WHERE ${clauses.join(" AND ")}
     GROUP BY agent_id, kind`,
    args,
  );
  const counts = new Map<AgentId, AgentResourceCounts>();
  for (const row of rows) {
    const agentId = row.agent_id as AgentId;
    const current = counts.get(agentId) ?? emptyResourceCounts();
    const key =
      row.kind === "skill"
        ? "skills"
        : row.kind === "instruction"
          ? "instructions"
          : row.kind === "memory"
            ? "memory"
            : row.kind === "config"
              ? "configs"
              : null;
    if (key) current[key] = Number(row.count);
    counts.set(agentId, current);
  }
  return counts;
}

function toAgentInfo(
  adapter: AgentAdapter,
  detection: AgentDetectionResult | null,
  resourceCounts: AgentResourceCounts,
): AgentInfo {
  return {
    id: adapter.id,
    name: adapter.name,
    binaryCandidates: adapter.binaryCandidates,
    versionCommand: adapter.versionCommand,
    globalConfigPaths: adapter.globalConfigPaths,
    projectConfigPaths: adapter.projectConfigPaths,
    globalSkillRoots: adapter.globalSkillRoots,
    projectSkillRoots: adapter.projectSkillRoots,
    instructionFilePatterns: adapter.instructionFilePatterns,
    memoryPatterns: adapter.memoryPatterns,
    supportedCommands: adapter.supportedCommands,
    detection,
    resourceCounts,
  };
}

async function getDetectionMap(db: Db): Promise<Map<AgentId, AgentDetectionResult>> {
  const rows = await db.all<DetectionRow>("SELECT * FROM agent_detections");
  const map = new Map<AgentId, AgentDetectionResult>();
  for (const row of rows) {
    map.set(row.agent_id as AgentId, rowToDetection(row));
  }
  return map;
}

export async function getAgentInfos(db: Db, filters: AgentFilters = {}): Promise<AgentInfo[]> {
  const detections = await getDetectionMap(db);
  const counts = await getResourceCounts(db, filters);
  return listAdapters().map((adapter) =>
    toAgentInfo(adapter, detections.get(adapter.id) ?? null, counts.get(adapter.id) ?? emptyResourceCounts()),
  );
}

export async function getAgentInfo(
  db: Db,
  agentId: AgentId,
  filters: AgentFilters = {},
): Promise<AgentInfo | null> {
  const adapter = getAdapter(agentId);
  if (!adapter) return null;
  const detections = await getDetectionMap(db);
  const counts = await getResourceCounts(db, filters);
  return toAgentInfo(adapter, detections.get(agentId) ?? null, counts.get(agentId) ?? emptyResourceCounts());
}

export async function refreshDetection(
  db: Db,
  agentId?: AgentId,
): Promise<AgentDetectionResult[]> {
  const settings = await getSettings(db);
  const timeoutMs = settings.detectionTimeoutMs;

  if (agentId) {
    const adapter = getAdapter(agentId);
    if (!adapter) return [];
    const result = await detectAgent(adapter, timeoutMs);
    await persistDetection(db, result);
    return [result];
  }

  const results = await detectAll(timeoutMs);
  await Promise.all(results.map((result) => persistDetection(db, result)));
  return results;
}
