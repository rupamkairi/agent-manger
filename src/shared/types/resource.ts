export type AgentId = "claude" | "codex" | "opencode";
export type AgentStatus = "installed" | "missing" | "unknown";
export type ResourceScope = "global" | "project" | "shared";
export type ValidationStatus = "valid" | "warning" | "invalid" | "unknown";
export type ScanStatus = "idle" | "scanning" | "complete" | "error";
export type Severity = "info" | "warning" | "critical";

export type PageId =
  | "dashboard"
  | "projects"
  | "agents"
  | "skills"
  | "instructions"
  | "memory"
  | "health"
  | "terminal"
  | "settings";

export interface Project {
  id: string;
  name: string;
  path: string;
  environment: "production" | "local" | "archive" | "secure";
  lastScanned: string;
  agentCount: number;
  skillCount: number;
  instructionCount: number;
  warningCount: number;
}

export interface Agent {
  id: AgentId;
  name: string;
  status: AgentStatus;
  version: string;
  binaryPath: string;
  resourcePaths: string[];
  commandStatus: ValidationStatus;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  scope: ResourceScope;
  agentTarget: string;
  location: string;
  status: ValidationStatus;
}

export interface InstructionFile {
  id: string;
  name: string;
  path: string;
  scope: ResourceScope;
  agentTarget: string;
  lastModified: string;
  status: ValidationStatus;
  content: string;
}

export interface MemoryFile {
  id: string;
  name: string;
  path: string;
  scope: ResourceScope;
  agentTarget: string;
  size: string;
  lastModified: string;
  status: ValidationStatus;
}

export interface Warning {
  id: string;
  severity: Severity;
  resource: string;
  reason: string;
  suggestedFix: string;
  time: string;
}

export interface ScanSummary {
  status: ScanStatus;
  selectedProjectId: string;
  lastScanTime: string;
  resourceCount: number;
  detectedAgentsCount: number;
  warningCount: number;
}

export interface TerminalLine {
  id: string;
  level: "INFO" | "WARN" | "ERR" | "EXEC" | "OK";
  time: string;
  message: string;
}

export interface ResourceCandidate {
  agent: AgentId;
  type: "instruction" | "config" | "skill-folder";
  scope: ResourceScope;
  path: string;
}
