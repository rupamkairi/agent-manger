import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentId, SkillSourceId } from "@harbor/shared";

/**
 * Anything the scanner can discover skills for: an agent adapter or the
 * agent-agnostic "shared" source. Declaring roots here is all that is needed —
 * the scanner iterates sources from the registry.
 */
export interface SkillSource {
  id: SkillSourceId;
  name: string;
  globalSkillRoots: string[];
  projectSkillRoots: string[];
}

export interface AgentAdapter extends SkillSource {
  id: AgentId;
  binaryCandidates: string[];
  versionCommand: string[];
  globalConfigPaths: string[];
  projectConfigPaths: string[];
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
