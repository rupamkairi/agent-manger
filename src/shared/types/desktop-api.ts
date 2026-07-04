import type {
  Agent,
  InstructionFile,
  MemoryFile,
  PersistedAppState,
  Project,
  Skill,
  TerminalCommandResult,
  TerminalLine,
  Warning,
} from "./resource.ts";

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
  checkAgentCommands(): Promise<Agent[]>;
  scanProject(path: string): Promise<DesktopSnapshot>;
  scanAllProjects(paths: string[]): Promise<DesktopSnapshot>;
  pickProjectFolder(): Promise<string | null>;
  loadAppState(): Promise<PersistedAppState | null>;
  saveAppState(state: PersistedAppState): Promise<void>;
  openPath(path: string): Promise<void>;
  openTerminal(path: string): Promise<void>;
  runShellCommand(command: string, cwd?: string): Promise<TerminalCommandResult>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
}
