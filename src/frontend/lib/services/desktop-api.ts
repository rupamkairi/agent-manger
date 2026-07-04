import type { DesktopApi, DesktopSnapshot } from "../../../shared/types/desktop-api";
import { agents, instructions, memoryFiles, projects, skills, terminalLines, warnings } from "$lib/stores/app-state.svelte";

declare global {
  interface Window {
    agentManager?: DesktopApi;
  }
}

export const desktopApi: DesktopApi = {
  detectAgents() {
    return window.agentManager?.detectAgents() ?? Promise.resolve(agents);
  },

  scanProject(path: string) {
    return window.agentManager?.scanProject(path) ?? Promise.resolve(fallbackSnapshot(path));
  },

  scanAllProjects(paths: string[]) {
    return window.agentManager?.scanAllProjects(paths) ?? Promise.resolve(fallbackSnapshot(paths.join(", ")));
  },

  openPath(path: string) {
    return window.agentManager?.openPath(path) ?? Promise.resolve();
  },

  openTerminal(path: string) {
    return window.agentManager?.openTerminal(path) ?? Promise.resolve();
  },

  readTextFile(path: string) {
    return window.agentManager?.readTextFile(path) ?? Promise.resolve(`# ${path}\n\nDesktop bridge unavailable.`);
  },

  writeTextFile(path: string, content: string) {
    return window.agentManager?.writeTextFile(path, content) ?? Promise.resolve();
  },
};

function fallbackSnapshot(path: string): DesktopSnapshot {
  return {
    projects,
    agents,
    skills,
    instructions,
    memoryFiles,
    warnings,
    logs: [
      ...terminalLines,
      {
        id: "fallback-scan",
        level: "WARN",
        time: "local",
        message: `Desktop scanner bridge unavailable. Showing cached sample state for ${path}.`,
      },
    ],
  };
}
