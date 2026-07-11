import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentId } from "@weave/shared";

export interface AgentAdapter {
  id: AgentId;
  name: string;
  binaryCandidates: string[];
  versionCommand: string[];
  globalConfigPaths: string[];
  projectConfigPaths: string[];
  globalSkillRoots: string[];
  projectSkillRoots: string[];
  instructionFilePatterns: {
    global: string[];
    project: string[];
  };
  memoryPatterns: {
    global: string[];
    project: string[];
  };
  supportedCommands: string[];
}

export function resolveGlobalPath(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

export function resolveProjectPath(projectRoot: string, path: string): string {
  return join(projectRoot, path);
}
