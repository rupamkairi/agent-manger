import type {
  Agent,
  InstructionFile,
  MemoryFile,
  PersistedAppState,
  Project,
  Skill,
  TerminalChunk,
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
  scanGlobalSkills(home?: string): Promise<DesktopSnapshot>;
  scanAllProjects(paths: string[]): Promise<DesktopSnapshot>;
  pickProjectFolder(): Promise<string | null>;
  loadAppState(): Promise<PersistedAppState | null>;
  saveAppState(state: PersistedAppState): Promise<void>;
  openPath(path: string): Promise<void>;
  terminalEnsureStarted(): Promise<void>;
  terminalRead(afterSeq: number): Promise<TerminalChunk[]>;
  terminalWrite(data: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
}
