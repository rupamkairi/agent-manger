import type { AgentId } from "@weave/shared";
import { claudeCodeAdapter } from "./claude-code";
import { codexAdapter } from "./codex";
import { opencodeAdapter } from "./opencode";
import type { AgentAdapter } from "./types";

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
