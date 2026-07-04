import type {
  Agent,
  InstructionFile,
  MemoryFile,
  PageId,
  Project,
  ScanSummary,
  Skill,
  TerminalLine,
  Warning,
} from "../../../shared/types/resource";

export const projects: Project[] = [
  {
    id: "agent-manager",
    name: "agent-manager",
    path: "/Users/rupamkairi/Projects/my-projects/agent-manger",
    environment: "local",
    lastScanned: "Just now",
    agentCount: 3,
    skillCount: 45,
    instructionCount: 28,
    warningCount: 2,
  },
  {
    id: "alpha-nexus",
    name: "Alpha-Nexus",
    path: "/volumes/cluster-01/agents/alpha-nexus",
    environment: "production",
    lastScanned: "2m ago",
    agentCount: 8,
    skillCount: 14,
    instructionCount: 12,
    warningCount: 1,
  },
  {
    id: "legacy-support",
    name: "Legacy-Support",
    path: "/mnt/archive/legacy-systems",
    environment: "archive",
    lastScanned: "6d ago",
    agentCount: 1,
    skillCount: 0,
    instructionCount: 4,
    warningCount: 4,
  },
];

export const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    status: "installed",
    version: "verified",
    binaryPath: "/usr/local/bin/claude",
    resourcePaths: ["~/.claude/skills", ".claude/skills", "CLAUDE.md"],
    commandStatus: "valid",
  },
  {
    id: "codex",
    name: "Codex",
    status: "installed",
    version: "verified",
    binaryPath: "/opt/homebrew/bin/codex",
    resourcePaths: ["~/.codex/skills", ".codex/skills", ".agents/skills", "AGENTS.md"],
    commandStatus: "valid",
  },
  {
    id: "opencode",
    name: "OpenCode",
    status: "unknown",
    version: "unknown",
    binaryPath: "Not verified",
    resourcePaths: ["~/.config/opencode/skills", ".opencode/skills", ".agents/skills"],
    commandStatus: "unknown",
  },
];

export const skills: Skill[] = [
  {
    id: "fetch-context",
    name: "Fetch_External_Context",
    description: "Retrieves JSON data from secure REST endpoints with OAuth2.",
    scope: "global",
    agentTarget: "Fleet-Universal",
    location: "~/.codex/skills/fetch-context",
    status: "valid",
  },
  {
    id: "rag-sync",
    name: "Local_RAG_Sync",
    description: "Synchronizes local vector storage with cloud instances.",
    scope: "project",
    agentTarget: "Data-Specialist-01",
    location: ".agents/skills/local-rag-sync",
    status: "warning",
  },
  {
    id: "auto-python",
    name: "Auto_Py_Executor",
    description: "Legacy Python 2.7 runtime for deprecated scripts.",
    scope: "global",
    agentTarget: "Archivist-Beta",
    location: "~/.claude/skills/auto-py-executor",
    status: "invalid",
  },
  {
    id: "token-validator",
    name: "Token_Validator",
    description: "Ensures session tokens meet compliance standards.",
    scope: "project",
    agentTarget: "Security-Proxy",
    location: ".codex/skills/token-validator",
    status: "valid",
  },
];

export const instructions: InstructionFile[] = [
  {
    id: "system-prompt",
    name: "system_prompt_v2.md",
    path: "/core/instructions/system_prompt_v2.md",
    scope: "global",
    agentTarget: "Codex",
    lastModified: "Oct 24, 2023 - 14:15:02",
    status: "valid",
    content:
      "# System Prompt v2\n## Core Directive\nYou are an autonomous agent manager tasked with optimizing throughput of multi-node execution chains.\n\n### Guidelines\n1. Maintain high-fidelity telemetry across all sub-agents.\n2. Ensure latency remains below 150ms for instruction parsing.\n3. Implement error recovery loops on terminal signal failures.\n\n```json\n{\n  \"agent_id\": \"manager-primary\",\n  \"version\": \"1.0.4\",\n  \"status\": \"ready\"\n}\n```",
  },
  {
    id: "safety",
    name: "safety_alignment.md",
    path: "/core/instructions/safety_alignment.md",
    scope: "global",
    agentTarget: "Claude Code",
    lastModified: "Oct 22, 2023 - 09:44:18",
    status: "warning",
    content: "# Safety Alignment\n\nResource access must stay local-first and explicit.",
  },
];

export const memoryFiles: MemoryFile[] = [
  {
    id: "codex-memory",
    name: "MEMORY.md",
    path: "~/.codex/memories/MEMORY.md",
    scope: "global",
    agentTarget: "Codex",
    size: "128 KB",
    lastModified: "Today",
    status: "valid",
  },
  {
    id: "project-memory",
    name: "project-memory.md",
    path: ".agents/memory/project-memory.md",
    scope: "project",
    agentTarget: "Shared",
    size: "18 KB",
    lastModified: "Yesterday",
    status: "unknown",
  },
];

export const warnings: Warning[] = [
  {
    id: "memory-leak",
    severity: "critical",
    resource: "Lead_Agent_01",
    reason: "High heap usage detected in Lead_Agent_01.",
    suggestedFix: "Run memory scan and inspect active prompt buffers.",
    time: "14:22:01",
  },
  {
    id: "latency-spike",
    severity: "warning",
    resource: "External_Worker_3",
    reason: "Latency exceeded 450ms on skill validation.",
    suggestedFix: "Re-route validation to local command runner.",
    time: "14:19:44",
  },
];

export const terminalLines: TerminalLine[] = [
  { id: "1", level: "INFO", time: "14:30:12", message: "Heartbeat signal confirmed from 3/3 active nodes." },
  { id: "2", level: "INFO", time: "14:30:15", message: "Instruction set #28 successfully injected into Lead_Agent_01." },
  { id: "3", level: "ERR", time: "14:31:02", message: "Buffer overflow on #node_77x2. Triggering circuit breaker." },
  { id: "4", level: "WARN", time: "14:31:05", message: "Resource re-allocation in progress for Analytic_Bot." },
  { id: "5", level: "EXEC", time: "14:32:00", message: "Scanning sub-networks for instruction updates..." },
];

const scanSummary: ScanSummary = $state({
  status: "complete",
  selectedProjectId: "agent-manager",
  lastScanTime: "Just now",
  resourceCount: 78,
  detectedAgentsCount: 3,
  warningCount: 2,
});

let currentPage = $state<PageId>("dashboard");
let selectedProjectId = $state("agent-manager");
let selectedResourceId = $state("fetch-context");
let detailsOpen = $state(true);
let terminalOpen = $state(true);
let terminalHeight = $state(184);

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page: PageId) {
  currentPage = page;
}

export function getScanSummary() {
  return scanSummary;
}

export function getSelectedProject() {
  return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
}

export function setSelectedProject(id: string) {
  selectedProjectId = id;
  scanSummary.selectedProjectId = id;
}

export function getSelectedResourceId() {
  return selectedResourceId;
}

export function setSelectedResource(id: string) {
  selectedResourceId = id;
}

export function getDetailsOpen() {
  return detailsOpen;
}

export function toggleDetails() {
  detailsOpen = !detailsOpen;
}

export function getTerminalOpen() {
  return terminalOpen;
}

export function toggleTerminal() {
  terminalOpen = !terminalOpen;
}

export function getTerminalHeight() {
  return terminalHeight;
}

export function setTerminalHeight(height: number) {
  terminalHeight = Math.min(320, Math.max(120, height));
}
