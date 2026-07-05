import type { DesktopApi, DesktopSnapshot } from "../../../shared/types/desktop-api.ts";
import type {
  PersistedAppState,
  Project,
  TerminalChunk,
  TerminalLine,
  Warning,
} from "../../../shared/types/resource.ts";

type DesktopBindings = Partial<Record<keyof DesktopApi, (...args: unknown[]) => unknown>>;

function getBindings() {
  return (globalThis as typeof globalThis & { bindings?: DesktopBindings }).bindings ?? null;
}

function getBrowserBridge() {
  return globalThis as typeof globalThis & { agentManager?: DesktopApi; localStorage?: Storage };
}

function invokeBinding(name: keyof DesktopApi, ...args: unknown[]) {
  const binding = getBindings()?.[name];

  if (!binding) {
    return null;
  }

  return binding(...args);
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

export const desktopApi: DesktopApi = {
  detectAgents() {
    const bound = invokeBinding("detectAgents");

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["detectAgents"]>>>;
    }

    return getBrowserBridge().agentManager?.detectAgents() ?? Promise.resolve([]);
  },

  checkAgentCommands() {
    const bound = invokeBinding("checkAgentCommands");

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["checkAgentCommands"]>>>;
    }

    return getBrowserBridge().agentManager?.checkAgentCommands() ?? Promise.resolve([]);
  },

  scanProject(path: string) {
    const bound = invokeBinding("scanProject", path);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["scanProject"]>>>;
    }

    return getBrowserBridge().agentManager?.scanProject(path) ?? Promise.resolve(fallbackSnapshot(path));
  },

  scanGlobalSkills(home?: string) {
    const bound = invokeBinding("scanGlobalSkills", home);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["scanGlobalSkills"]>>>;
    }

    return getBrowserBridge().agentManager?.scanGlobalSkills(home) ?? Promise.resolve({
      projects: [],
      agents: [],
      skills: [],
      instructions: [],
      memoryFiles: [],
      warnings: fallbackWarnings,
      logs: [
        ...fallbackLogs,
        {
          id: "fallback-global-skills",
          level: "WARN",
          time: "local",
          message: "Global skill scan unavailable.",
        },
      ],
    });
  },

  scanAllProjects(paths: string[]) {
    const bound = invokeBinding("scanAllProjects", paths);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["scanAllProjects"]>>>;
    }

    return getBrowserBridge().agentManager?.scanAllProjects(paths) ?? Promise.resolve(fallbackSnapshot(paths.join(", ")));
  },

  pickProjectFolder() {
    const bound = invokeBinding("pickProjectFolder");

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["pickProjectFolder"]>>>;
    }

    return getBrowserBridge().agentManager?.pickProjectFolder() ?? Promise.resolve(null);
  },

  loadAppState() {
    const bound = invokeBinding("loadAppState");

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["loadAppState"]>>>;
    }

    const browserBridge = getBrowserBridge().agentManager;

    if (browserBridge?.loadAppState) {
      return browserBridge.loadAppState();
    }

    return Promise.resolve(loadBrowserState());
  },

  saveAppState(state: PersistedAppState) {
    const bound = invokeBinding("saveAppState", state);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["saveAppState"]>>>;
    }

    const browserBridge = getBrowserBridge().agentManager;

    if (browserBridge?.saveAppState) {
      return browserBridge.saveAppState(state);
    }

    saveBrowserState(state);
    return Promise.resolve();
  },

  openPath(path: string) {
    const bound = invokeBinding("openPath", path);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["openPath"]>>>;
    }

    return getBrowserBridge().agentManager?.openPath(path) ?? Promise.resolve();
  },

  terminalEnsureStarted() {
    const bound = invokeBinding("terminalEnsureStarted");

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["terminalEnsureStarted"]>>>;
    }

    return getBrowserBridge().agentManager?.terminalEnsureStarted() ?? Promise.resolve();
  },

  terminalRead(afterSeq: number) {
    const bound = invokeBinding("terminalRead", afterSeq);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["terminalRead"]>>>;
    }

    return getBrowserBridge().agentManager?.terminalRead(afterSeq) ?? Promise.resolve([] satisfies TerminalChunk[]);
  },

  terminalWrite(data: string) {
    const bound = invokeBinding("terminalWrite", data);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["terminalWrite"]>>>;
    }

    return getBrowserBridge().agentManager?.terminalWrite(data) ?? Promise.resolve();
  },

  readTextFile(path: string) {
    const bound = invokeBinding("readTextFile", path);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["readTextFile"]>>>;
    }

    return getBrowserBridge().agentManager?.readTextFile(path) ?? Promise.resolve(`# ${path}\n\nDesktop bridge unavailable.`);
  },

  writeTextFile(path: string, content: string) {
    const bound = invokeBinding("writeTextFile", path, content);

    if (bound) {
      return bound as Promise<Awaited<ReturnType<DesktopApi["writeTextFile"]>>>;
    }

    return getBrowserBridge().agentManager?.writeTextFile(path, content) ?? Promise.resolve();
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
  const storage = getBrowserBridge().localStorage;

  if (!storage) {
    return null;
  }

  const content = storage.getItem("agent-manager-state");

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
  getBrowserBridge().localStorage?.setItem("agent-manager-state", JSON.stringify(state));
}
