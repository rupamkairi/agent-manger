import type { Agent, AgentId, ValidationStatus } from "../shared/types/resource.ts";
import { resolveHomeDirectory } from "./runtime-env.ts";

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;
type PathExists = (path: string) => Promise<boolean>;

type AgentDefinition = {
  id: AgentId;
  name: string;
  command: string;
  resourcePaths: (home: string) => string[];
};

export async function detectAgents(
  run: CommandRunner = runCommand,
  pathExists: PathExists = defaultPathExists,
  home = Deno.env.get("HOME") ?? "",
): Promise<Agent[]> {
  return probeAgents(run, pathExists, home.trim() || await resolveHomeDirectory(run));
}

export async function checkAgentCommands(
  run: CommandRunner = runCommand,
  pathExists: PathExists = defaultPathExists,
  home = Deno.env.get("HOME") ?? "",
): Promise<Agent[]> {
  return probeAgents(run, pathExists, home.trim() || await resolveHomeDirectory(run));
}

function getAgentDefinitions(): AgentDefinition[] {
  return [
    {
      id: "claude",
      name: "Claude Code",
      command: "claude",
      resourcePaths: (home) => [`${home}/.claude/skills`],
    },
    {
      id: "codex",
      name: "Codex",
      command: "codex",
      resourcePaths: (home) => [`${home}/.codex/skills`, `${home}/.codex/memories`],
    },
    {
      id: "opencode",
      name: "OpenCode",
      command: "opencode",
      resourcePaths: (home) => [`${home}/.config/opencode/skills`],
    },
  ];
}

async function probeAgents(run: CommandRunner, pathExists: PathExists, home: string) {
  return Promise.all(getAgentDefinitions().map((definition) => probeAgent(definition, run, pathExists, home)));
}

async function probeAgent(definition: AgentDefinition, run: CommandRunner, pathExists: PathExists, home: string) {
  const lookup = await run("command", ["-v", definition.command]);
  const installed = lookup.code === 0;
  const binaryPath = installed ? lookup.stdout.trim() : "Not found";
  const version = installed ? await probeVersion(binaryPath, run) : "unknown";
  const resourcePaths = await getExistingResourcePaths(definition, home, pathExists);

  return {
    id: definition.id,
    name: definition.name,
    status: installed ? "installed" : "missing",
    version,
    binaryPath,
    resourcePaths,
    commandStatus: resolveCommandStatus(binaryPath, version),
  } satisfies Agent;
}

async function probeVersion(binaryPath: string, run: CommandRunner) {
  const versionLookup = await run(binaryPath, ["--version"]);

  if (versionLookup.code !== 0) {
    return "unknown";
  }

  return firstLine(versionLookup.stdout) ?? "unknown";
}

async function getExistingResourcePaths(definition: AgentDefinition, home: string, pathExists: PathExists) {
  const candidates = definition.resourcePaths(home).filter(Boolean);
  const existing: string[] = [];

  for (const path of candidates) {
    if (await pathExists(path)) {
      existing.push(path);
    }
  }

  return existing;
}

function resolveCommandStatus(binaryPath: string, version: string): ValidationStatus {
  if (!binaryPath || binaryPath === "Not found") {
    return "invalid";
  }

  if (!version || version === "unknown") {
    return "warning";
  }

  return "valid";
}

function firstLine(value: string) {
  return value.trim().split("\n").find(Boolean) ?? null;
}

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  const shellCommand = buildShellCommand(command, args);
  const output = await new Deno.Command("bash", { args: ["-lc", shellCommand] }).output();

  return {
    code: output.code,
    stdout: new TextDecoder().decode(output.stdout),
    stderr: new TextDecoder().decode(output.stderr),
  };
}

export function buildShellCommand(command: string, args: string[]) {
  return [shellToken(command), ...args.map(shellToken)].join(" ");
}

function shellToken(value: string) {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

async function defaultPathExists(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }

    throw error;
  }
}
