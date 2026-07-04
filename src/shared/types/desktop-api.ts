import type {
  Agent,
  InstructionFile,
  MemoryFile,
  Project,
  Skill,
  TerminalLine,
  Warning,
} from "./resource";

export interface DesktopSnapshot {
  projects: Project[];
  agents: Agent[];
  skills: Skill[];
  instructions: InstructionFile[];
  memoryFiles: MemoryFile[];
  warnings: Warning[];
  logs: TerminalLine[];
}

export interface DesktopApi {
  detectAgents(): Promise<Agent[]>;
  scanProject(path: string): Promise<DesktopSnapshot>;
  scanAllProjects(paths: string[]): Promise<DesktopSnapshot>;
  openPath(path: string): Promise<void>;
  openTerminal(path: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
}
