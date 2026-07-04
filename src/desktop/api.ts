import type { DesktopApi, DesktopSnapshot } from "../shared/types/desktop-api.ts";
import type {
  InstructionFile,
  Project,
  ResourceCandidate,
  Skill,
  TerminalCommandResult,
  TerminalLine,
  Warning,
} from "../shared/types/resource.ts";
import { checkAgentCommands, detectAgents } from "./agents.ts";
import { getAppStatePath, loadAppStateFile, saveAppStateFile } from "./persistence.ts";
import {
  detectAgentForInstructionPath,
  extractSkillDescription,
  pathExists,
  scanProjectPaths,
  validateSkillManifest,
} from "./scanner.ts";

export const desktopApi: DesktopApi = {
  async detectAgents() {
    return detectAgents();
  },

  async checkAgentCommands() {
    return checkAgentCommands();
  },

  async scanProject(path: string) {
    const resources = await scanProjectPaths(path);
    const project = summarizeProject(path, resources);
    const warnings: Warning[] = [];
    const logs: TerminalLine[] = [
      { id: crypto.randomUUID(), level: "INFO", time: currentTime(), message: `Scanning ${path}` },
    ];
    const skillEntries = await Promise.all(
      resources.filter((resource) => resource.type === "skill-folder").map((resource) => buildSkillEntry(resource)),
    );
    const instructionEntries = await Promise.all(
      resources.filter((resource) => resource.type === "instruction").map((resource) => buildInstructionEntry(resource)),
    );

    for (const entry of skillEntries) {
      logs.push(entry.log);

      if (entry.warning) {
        warnings.push(entry.warning);
      }
    }

    for (const entry of instructionEntries) {
      logs.push(entry.log);

      if (entry.warning) {
        warnings.push(entry.warning);
      }
    }

    return {
      projects: [project],
      agents: await detectAgents(),
      skills: skillEntries.map((entry) => entry.skill),
      instructions: instructionEntries.map((entry) => entry.instruction),
      memoryFiles: [],
      warnings,
      logs,
    };
  },

  async scanAllProjects(paths: string[]) {
    const snapshots = await Promise.all(paths.map((path) => desktopApi.scanProject(path)));
    return mergeSnapshots(snapshots);
  },

  pickProjectFolder() {
    return pickProjectFolder();
  },

  loadAppState() {
    return loadAppStateFile(getAppStatePath());
  },

  saveAppState(state) {
    return saveAppStateFile(getAppStatePath(), state);
  },

  async openPath(path: string) {
    await new Deno.Command("open", { args: [path] }).output();
  },

  async openTerminal(path: string) {
    await new Deno.Command("open", { args: ["-a", "Terminal", path] }).output();
  },

  async runShellCommand(command: string, cwd?: string): Promise<TerminalCommandResult> {
    const process = new Deno.Command("bash", {
      args: ["-lc", command],
      cwd: cwd?.trim() ? cwd : undefined,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await process.output();

    return {
      command,
      cwd: cwd?.trim() ? cwd : null,
      shell: "bash",
      exitCode: output.code,
      stdout: new TextDecoder().decode(output.stdout),
      stderr: new TextDecoder().decode(output.stderr),
    };
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
    agents: snapshots.at(-1)?.agents ?? [],
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

function currentTimestamp() {
  return new Date().toLocaleString("sv-SE").replace("T", " ");
}

function formatTimestamp(date: Date) {
  return date.toLocaleString("sv-SE").replace("T", " ");
}

function summarizeProject(path: string, resources: Awaited<ReturnType<typeof scanProjectPaths>>): Project {
  const uniqueAgents = new Set(resources.map((resource) => resource.agent));

  return {
    id: pathToId(path),
    name: basename(path),
    path,
    environment: "local",
    lastScanned: currentTimestamp(),
    agentCount: uniqueAgents.size,
    skillCount: resources.filter((resource) => resource.type === "skill-folder").length,
    instructionCount: resources.filter((resource) => resource.type === "instruction").length,
    warningCount: 0,
  };
}

async function pickProjectFolder() {
  let selection: Deno.CommandOutput;

  try {
    selection = await new Deno.Command("osascript", {
      args: ["-e", 'POSIX path of (choose folder with prompt "Select a project folder")'],
    }).output();
  } catch {
    return null;
  }

  if (selection.code !== 0) {
    return null;
  }

  return new TextDecoder().decode(selection.stdout).trim().replace(/\/$/, "");
}

function basename(path: string) {
  const normalized = path.replace(/\/$/, "");
  const parts = normalized.split("/");
  return parts.at(-1) || normalized;
}

function pathToId(path: string) {
  return path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function buildSkillEntry(resource: ResourceCandidate) {
  const manifestPath = `${resource.path.replace(/\/$/, "")}/SKILL.md`;
  const exists = await pathExists(manifestPath);
  const content = exists ? await Deno.readTextFile(manifestPath) : "";
  const validation = exists ? validateSkillManifest(content) : { status: "invalid" as const, issues: ["Missing SKILL.md"] };

  return {
    skill: {
      id: pathToId(resource.path),
      name: basename(resource.path),
      description: extractSkillDescription(content) || "No description found.",
      scope: resource.scope,
      agentTarget: resource.agent,
      location: exists ? manifestPath : resource.path,
      status: validation.status,
    } satisfies Skill,
    warning: validation.status === "valid"
      ? null
      : {
          id: crypto.randomUUID(),
          severity: validation.status === "invalid" ? "critical" : "warning",
          resource: basename(resource.path),
          reason: validation.issues.join(", "),
          suggestedFix: "Add a top-level heading and description metadata to SKILL.md.",
          time: currentTime(),
        } satisfies Warning,
    log: {
      id: crypto.randomUUID(),
      level: validation.status === "valid" ? "OK" : validation.status === "warning" ? "WARN" : "ERR",
      time: currentTime(),
      message: `${validation.status.toUpperCase()} skill folder ${resource.path}`,
    } satisfies TerminalLine,
  };
}

async function buildInstructionEntry(resource: ResourceCandidate) {
  let content = "";
  let readFailed = false;

  try {
    content = await Deno.readTextFile(resource.path);
  } catch {
    readFailed = true;
  }

  const stat = await Deno.stat(resource.path).catch(() => null);
  const status = readFailed ? "invalid" : content.trim() ? "valid" : "warning";
  const agentTarget = detectAgentForInstructionPath(resource.path);

  return {
    instruction: {
      id: pathToId(resource.path),
      name: basename(resource.path),
      path: resource.path,
      scope: resource.scope,
      agentTarget: agentTarget === "unknown" ? resource.agent : agentTarget,
      lastModified: stat?.mtime ? formatTimestamp(stat.mtime) : "unknown",
      status,
      content,
    } satisfies InstructionFile,
    warning: status === "valid"
      ? null
      : {
          id: crypto.randomUUID(),
          severity: status === "invalid" ? "critical" : "warning",
          resource: basename(resource.path),
          reason: readFailed ? "Could not read instruction file." : "Instruction file is empty.",
          suggestedFix: "Add content to the instruction file or remove the stale entry.",
          time: currentTime(),
        } satisfies Warning,
    log: {
      id: crypto.randomUUID(),
      level: status === "valid" ? "OK" : status === "warning" ? "WARN" : "ERR",
      time: currentTime(),
      message: `${status.toUpperCase()} instruction ${resource.path}`,
    } satisfies TerminalLine,
  };
}
