import type { AgentId, SkillSourceId } from "@weave/shared";
import { agentsStandardSource } from "./agents-standard";
import { claudeCodeAdapter } from "./claude-code";
import { codexAdapter } from "./codex";
import { opencodeAdapter } from "./opencode";
import type { AgentAdapter, SkillSource } from "./types";

// To support a new agent, add its adapter to this list. The scanner,
// detection, and skill discovery all iterate the registry.
const adapters = new Map<AgentId, AgentAdapter>([
  [claudeCodeAdapter.id, claudeCodeAdapter],
  [codexAdapter.id, codexAdapter],
  [opencodeAdapter.id, opencodeAdapter],
]);

export function getAdapter(agentId: AgentId): AgentAdapter | undefined {
  return adapters.get(agentId);
}

export function listAdapters(): AgentAdapter[] {
  return Array.from(adapters.values());
}

export function listSkillSources(): SkillSource[] {
  return [...adapters.values(), agentsStandardSource];
}

export function getSkillSource(sourceId: SkillSourceId): SkillSource | undefined {
  return listSkillSources().find((source) => source.id === sourceId);
}
