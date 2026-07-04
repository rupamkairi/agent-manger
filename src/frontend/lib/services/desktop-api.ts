import type { DesktopApi, DesktopSnapshot } from "../../../shared/types/desktop-api";
import type {
  PersistedAppState,
  Project,
  TerminalCommandResult,
  TerminalLine,
  Warning,
} from "../../../shared/types/resource";

declare global {
  interface Window {
    agentManager?: DesktopApi;
  }
}

const fallbackWarnings: Warning[] = [
  {
    id: "desktop-bridge",
    severity: "warning",
    resource: "Desktop Bridge",
    reason: "Running without the desktop bridge. Folder picker and persistence fall back to local browser state.",
    suggestedFix: "Open the desktop app for native file access.",
    time: "local",
  },
];

const fallbackLogs: TerminalLine[] = [
  { id: "desktop-bridge", level: "WARN", time: "local", message: "Desktop bridge unavailable." },
];

function fallbackTerminalResult(command: string, cwd?: string): TerminalCommandResult {
  return {
    command,
    cwd: cwd?.trim() ? cwd : null,
    shell: "bash",
    exitCode: 127,
    stdout: "",
    stderr: "Desktop bridge unavailable.",
  };
}

export const desktopApi: DesktopApi = {
  detectAgents() {
    return window.agentManager?.detectAgents() ?? Promise.resolve([]);
  },

  checkAgentCommands() {
    return window.agentManager?.checkAgentCommands() ?? Promise.resolve([]);
  },

  scanProject(path: string) {
    return window.agentManager?.scanProject(path) ?? Promise.resolve(fallbackSnapshot(path));
  },

  scanAllProjects(paths: string[]) {
    return window.agentManager?.scanAllProjects(paths) ?? Promise.resolve(fallbackSnapshot(paths.join(", ")));
  },

  pickProjectFolder() {
    return window.agentManager?.pickProjectFolder() ?? Promise.resolve(null);
  },

  loadAppState() {
    if (window.agentManager?.loadAppState) {
      return window.agentManager.loadAppState();
    }

    return Promise.resolve(loadBrowserState());
  },

  saveAppState(state) {
    if (window.agentManager?.saveAppState) {
      return window.agentManager.saveAppState(state);
    }

    saveBrowserState(state);
    return Promise.resolve();
  },

  openPath(path: string) {
    return window.agentManager?.openPath(path) ?? Promise.resolve();
  },

  openTerminal(path: string) {
    return window.agentManager?.openTerminal(path) ?? Promise.resolve();
  },

  runShellCommand(command: string, cwd?: string) {
    return window.agentManager?.runShellCommand(command, cwd) ?? Promise.resolve(fallbackTerminalResult(command, cwd));
  },

  readTextFile(path: string) {
    return window.agentManager?.readTextFile(path) ?? Promise.resolve(`# ${path}\n\nDesktop bridge unavailable.`);
  },

  writeTextFile(path: string, content: string) {
    return window.agentManager?.writeTextFile(path, content) ?? Promise.resolve();
  },
};

function fallbackSnapshot(path: string): DesktopSnapshot {
  const project: Project = {
    id: path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(),
    name: path.split("/").filter(Boolean).at(-1) ?? path,
    path,
    environment: "local",
    lastScanned: "browser",
    agentCount: 0,
    skillCount: 0,
    instructionCount: 0,
    warningCount: 0,
  };

  return {
    projects: [project],
    agents: [],
    skills: [],
    instructions: [],
    memoryFiles: [],
    warnings: fallbackWarnings,
    logs: [
      ...fallbackLogs,
      {
        id: "fallback-scan",
        level: "WARN",
        time: "local",
        message: `Showing local fallback state for ${path}.`,
      },
    ],
  };
}

function loadBrowserState(): PersistedAppState | null {
  const content = window.localStorage.getItem("agent-manager-state");

  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as PersistedAppState;
  } catch {
    return null;
  }
}

function saveBrowserState(state: PersistedAppState) {
  window.localStorage.setItem("agent-manager-state", JSON.stringify(state));
}
