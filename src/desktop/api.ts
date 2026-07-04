import type { DesktopApi, DesktopSnapshot } from "../shared/types/desktop-api.ts";
import type { Agent, TerminalLine, Warning } from "../shared/types/resource.ts";
import { scanProjectPaths, validateSkillManifest } from "./scanner.ts";

const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    status: "unknown",
    version: "unknown",
    binaryPath: "Not verified",
    resourcePaths: ["~/.claude/skills", "CLAUDE.md", ".claude/skills"],
    commandStatus: "unknown",
  },
  {
    id: "codex",
    name: "Codex",
    status: "unknown",
    version: "unknown",
    binaryPath: "Not verified",
    resourcePaths: ["~/.codex/skills", "AGENTS.md", ".codex/skills", ".agents/skills"],
    commandStatus: "unknown",
  },
  {
    id: "opencode",
    name: "OpenCode",
    status: "unknown",
    version: "unknown",
    binaryPath: "Not verified",
    resourcePaths: ["~/.config/opencode/skills", ".opencode/skills"],
    commandStatus: "unknown",
  },
];

export const desktopApi: DesktopApi = {
  async detectAgents() {
    return agents;
  },

  async scanProject(path: string) {
    const resources = await scanProjectPaths(path);
    const warnings: Warning[] = [];
    const logs: TerminalLine[] = [
      { id: crypto.randomUUID(), level: "INFO", time: currentTime(), message: `Scanning ${path}` },
    ];

    for (const resource of resources) {
      if (resource.type === "skill-folder") {
        logs.push({
          id: crypto.randomUUID(),
          level: "INFO",
          time: currentTime(),
          message: `Detected skill folder ${resource.path}`,
        });
      }
    }

    return {
      projects: [],
      agents,
      skills: [],
      instructions: [],
      memoryFiles: [],
      warnings,
      logs,
    };
  },

  async scanAllProjects(paths: string[]) {
    const snapshots = await Promise.all(paths.map((path) => desktopApi.scanProject(path)));
    return mergeSnapshots(snapshots);
  },

  async openPath(path: string) {
    await new Deno.Command("open", { args: [path] }).output();
  },

  async openTerminal(path: string) {
    await new Deno.Command("open", { args: ["-a", "Terminal", path] }).output();
  },

  readTextFile(path: string) {
    return Deno.readTextFile(path);
  },

  writeTextFile(path: string, content: string) {
    return Deno.writeTextFile(path, content);
  },
};

export { validateSkillManifest };

function mergeSnapshots(snapshots: DesktopSnapshot[]): DesktopSnapshot {
  return {
    projects: snapshots.flatMap((snapshot) => snapshot.projects),
    agents,
    skills: snapshots.flatMap((snapshot) => snapshot.skills),
    instructions: snapshots.flatMap((snapshot) => snapshot.instructions),
    memoryFiles: snapshots.flatMap((snapshot) => snapshot.memoryFiles),
    warnings: snapshots.flatMap((snapshot) => snapshot.warnings),
    logs: snapshots.flatMap((snapshot) => snapshot.logs),
  };
}

function currentTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
