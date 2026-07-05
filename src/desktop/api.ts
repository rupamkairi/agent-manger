import type { DesktopApi, DesktopSnapshot } from "../shared/types/desktop-api.ts";
import type {
  InstructionFile,
  Project,
  ResourceCandidate,
  Skill,
  TerminalChunk,
  TerminalLine,
  Warning,
} from "../shared/types/resource.ts";
import { checkAgentCommands, detectAgents } from "./agents.ts";
import { pickProjectFolder } from "./picker.ts";
import { getAppDatabasePath, loadAppStateFile, saveAppStateFile } from "./persistence.ts";
import { ensureReadAccess } from "./read-access.ts";
import { resolveHomeDirectory } from "./runtime-env.ts";
import { terminalSession } from "./terminal-session.ts";
import {
  detectAgentForInstructionPath,
  extractSkillDescription,
  extractSkillName,
  getGlobalSkillRoots,
  getProjectSkillRoots,
  pathExists,
  scanSkillRoots,
  scanProjectPaths,
  validateSkillManifest,
} from "./scanner.ts";

const DEBUG_PREFIX = "[DEBUG-skillscan]";

export const desktopApi: DesktopApi = {
  async detectAgents() {
    return detectAgents();
  },

  async checkAgentCommands() {
    return checkAgentCommands();
  },

  async scanProject(path: string) {
    if (await ensureReadAccess(path) === "denied") {
      return {
        projects: [summarizeProject(path, [])],
        agents: await detectAgents(),
        skills: [],
        instructions: [],
        memoryFiles: [],
        warnings: [createWarning("permission-denied", "warning", basename(path), `Read access denied for project root ${path}.`, "Allow read access to the selected project root and rescan.")],
        logs: [
          { id: crypto.randomUUID(), level: "ERR", time: currentTime(), message: `Project scan blocked by read permission: ${path}` },
        ],
      };
    }

    debugLog(`scanProject:start path=${path}`);
    const resources = await scanProjectPaths(path);
    const project = summarizeProject(path, resources);
    const [skillBundle, instructionBundle] = await Promise.all([
      buildSkillBundle(resources.filter((resource) => resource.type === "skill-folder"), project.id),
      buildInstructionBundle(resources.filter((resource) => resource.type === "instruction")),
    ]);
    const rootWarnings = await buildRootWarnings(getProjectSkillRoots(path), "project", basename(path));
    debugLog(
      `scanProject:done path=${path} resources=${resources.length} skills=${skillBundle.skills.length} instructions=${instructionBundle.instructions.length} warnings=${rootWarnings.length + skillBundle.warnings.length + instructionBundle.warnings.length}`,
    );

    return {
      projects: [project],
      agents: await detectAgents(),
      skills: skillBundle.skills,
      instructions: instructionBundle.instructions,
      memoryFiles: [],
      warnings: [...rootWarnings, ...skillBundle.warnings, ...instructionBundle.warnings],
      logs: [
        { id: crypto.randomUUID(), level: "INFO", time: currentTime(), message: `Scanning ${path}` },
        ...skillBundle.logs,
        ...instructionBundle.logs,
      ],
    };
  },

  async scanGlobalSkills(home = Deno.env.get("HOME") ?? "") {
    const resolvedHome = home.trim() ? home.trim() : await resolveHomeDirectory();

    debugLog(`scanGlobalSkills:start home=${resolvedHome || "<empty>"}`);

    if (!resolvedHome) {
      return {
        projects: [],
        agents: [],
        skills: [],
        instructions: [],
        memoryFiles: [],
        warnings: [createWarning("home-unresolved", "warning", "Global Skills", "Could not resolve HOME for desktop runtime.", "Expose HOME to the desktop runtime or keep the shell fallback available.")],
        logs: [
          { id: crypto.randomUUID(), level: "ERR", time: currentTime(), message: "Global skill scan skipped because HOME could not be resolved." },
        ],
      };
    }

    const accessibleRoots = await filterAccessibleRoots(getGlobalSkillRoots(resolvedHome));
    const grantedRoots = accessibleRoots.filter((root) => root.access === "granted").map(({ access: _access, ...root }) => root);
    const resources = await scanSkillRoots(grantedRoots);
    const skillBundle = await buildSkillBundle(resources, null);
    const rootWarnings = await buildRootWarnings(accessibleRoots, "global", resolvedHome);
    debugLog(
      `scanGlobalSkills:done home=${resolvedHome || "<empty>"} resources=${resources.length} skills=${skillBundle.skills.length} warnings=${rootWarnings.length + skillBundle.warnings.length}`,
    );

    return {
      projects: [],
      agents: [],
      skills: skillBundle.skills,
      instructions: [],
      memoryFiles: [],
      warnings: [...rootWarnings, ...skillBundle.warnings],
      logs: [
        { id: crypto.randomUUID(), level: "INFO", time: currentTime(), message: "Scanning global skill roots" },
        ...skillBundle.logs,
      ],
    };
  },

  async scanAllProjects(paths: string[]) {
    const snapshots = await Promise.all(paths.map((path) => desktopApi.scanProject(path)));
    return mergeSnapshots(snapshots);
  },

  pickProjectFolder() {
    return pickProjectFolder();
  },

  async loadAppState() {
    return loadAppStateFile(getAppDatabasePath(await resolveHomeDirectory()));
  },

  async saveAppState(state) {
    return saveAppStateFile(getAppDatabasePath(await resolveHomeDirectory()), state);
  },

  async openPath(path: string) {
    await new Deno.Command("open", { args: [path] }).output();
  },

  async terminalEnsureStarted() {
    await terminalSession.ensureStarted();
  },

  async terminalRead(afterSeq: number): Promise<TerminalChunk[]> {
    await terminalSession.ensureStarted();
    return terminalSession.readSince(afterSeq);
  },

  async terminalWrite(data: string) {
    await terminalSession.write(data);
  },

  readTextFile(path: string) {
    return Deno.readTextFile(path);
  },

  writeTextFile(path: string, content: string) {
    return Deno.writeTextFile(path, content);
  },
};

export function bindDesktopApi(
  win: { bind(name: string, handler: (...args: unknown[]) => unknown): void },
  api: DesktopApi = desktopApi,
) {
  for (const [name, value] of Object.entries(api)) {
    if (typeof value !== "function") {
      continue;
    }

    win.bind(name, value.bind(api));
  }
}

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

function debugLog(message: string) {
  console.log(`${DEBUG_PREFIX} ${message}`);
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

function basename(path: string) {
  const normalized = path.replace(/\/$/, "");
  const parts = normalized.split("/");
  return parts.at(-1) || normalized;
}

function pathToId(path: string) {
  return path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function buildSkillEntry(resource: ResourceCandidate, sourceProjectId: string | null) {
  const manifestPath = `${resource.path.replace(/\/$/, "")}/SKILL.md`;
  const exists = await pathExists(manifestPath);
  const content = exists ? await Deno.readTextFile(manifestPath) : "";
  const validation = exists ? validateSkillManifest(content) : { status: "invalid" as const, issues: ["Missing SKILL.md"] };
  debugLog(
    `skill-entry scope=${resource.scope} agent=${resource.agent} root=${resource.path} manifest=${manifestPath} exists=${exists ? "yes" : "no"} status=${validation.status} sourceProjectId=${sourceProjectId ?? "global"}`,
  );

  return {
    skill: {
      id: pathToId(resource.path),
      name: extractSkillName(content, basename(resource.path)),
      description: extractSkillDescription(content) || "No description found.",
      scope: resource.scope,
      agentTarget: resource.agent,
      location: exists ? manifestPath : resource.path,
      sourceProjectId,
      status: validation.status,
      duplicateName: false,
    } satisfies Skill,
    warning: validation.status === "valid"
      ? null
      : {
          id: crypto.randomUUID(),
          category: "invalid-skill",
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

async function buildSkillBundle(resources: ResourceCandidate[], sourceProjectId: string | null) {
  debugLog(`buildSkillBundle:start sourceProjectId=${sourceProjectId ?? "global"} resourceCount=${resources.length}`);
  const entries = await Promise.all(resources.map((resource) => buildSkillEntry(resource, sourceProjectId)));
  debugLog(`buildSkillBundle:done sourceProjectId=${sourceProjectId ?? "global"} skillCount=${entries.length}`);

  return {
    skills: entries.map((entry) => entry.skill),
    warnings: entries.flatMap((entry) => (entry.warning ? [entry.warning] : [])),
    logs: entries.map((entry) => entry.log),
  };
}

async function buildInstructionBundle(resources: ResourceCandidate[]) {
  const entries = await Promise.all(resources.map((resource) => buildInstructionEntry(resource)));

  return {
    instructions: entries.map((entry) => entry.instruction),
    warnings: entries.flatMap((entry) => (entry.warning ? [entry.warning] : [])),
    logs: entries.map((entry) => entry.log),
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

async function filterAccessibleRoots<T extends { path: string }>(roots: T[]) {
  const results: Array<T & { access: "granted" | "denied" }> = [];

  for (const root of roots) {
    const access = await ensureReadAccess(root.path);
    debugLog(`root-permission root=${root.path} access=${access}`);
    results.push({ ...root, access });
  }

  return results;
}

async function buildRootWarnings(
  roots: Array<{ path: string; access?: "granted" | "denied" }>,
  scopeLabel: "global" | "project",
  resource: string,
) {
  const warnings: Warning[] = [];
  let existingRootCount = 0;

  for (const root of roots) {
    if (root.access === "denied") {
      warnings.push(
        createWarning("permission-denied", "warning", resource, `Read access denied for skill root ${root.path}.`, "Allow read access to the blocked skill root and rescan."),
      );
      continue;
    }

    if (await pathExists(root.path)) {
      existingRootCount += 1;
    }
  }

  if (existingRootCount === 0) {
    warnings.push(
      createWarning(
        "root-missing",
        "info",
        resource,
        scopeLabel === "global" ? "No global skill roots were found under the resolved home directory." : "No project skill roots were found under the selected project.",
        scopeLabel === "global" ? "Create a supported global skills directory or verify the resolved home directory." : "Create one of the supported project skill folders and rescan.",
      ),
    );
  }

  return warnings;
}

function createWarning(category: string, severity: Warning["severity"], resource: string, reason: string, suggestedFix: string): Warning {
  return {
    id: crypto.randomUUID(),
    category,
    severity,
    resource,
    reason,
    suggestedFix,
    time: currentTime(),
  };
}
