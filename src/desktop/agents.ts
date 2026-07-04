import type { Agent, AgentId, AgentStatus, ValidationStatus } from "../shared/types/resource.ts";

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

const AGENT_DEFINITIONS: AgentDefinition[] = [
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

export async function detectAgents(
  run: CommandRunner = runCommand,
  pathExists: PathExists = defaultPathExists,
  home = Deno.env.get("HOME") ?? "",
): Promise<Agent[]> {
  return Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => {
      const lookup = await run("which", [definition.command]);
      const binaryPath = lookup.code === 0 ? lookup.stdout.trim() : "Not found";
      const status: AgentStatus = lookup.code === 0 ? "installed" : "missing";
      const resourcePaths = await getExistingResourcePaths(definition, home, pathExists);

      return {
        id: definition.id,
        name: definition.name,
        status,
        version: status === "installed" ? "installed" : "unknown",
        binaryPath,
        resourcePaths,
        commandStatus: status === "installed" ? "valid" : "invalid",
      };
    }),
  );
}

export async function checkAgentCommands(
  run: CommandRunner = runCommand,
  pathExists: PathExists = defaultPathExists,
  home = Deno.env.get("HOME") ?? "",
): Promise<Agent[]> {
  return Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => {
      const lookup = await run("which", [definition.command]);

      if (lookup.code !== 0) {
        return {
          id: definition.id,
          name: definition.name,
          status: "missing",
          version: "unknown",
          binaryPath: "Not found",
          resourcePaths: await getExistingResourcePaths(definition, home, pathExists),
          commandStatus: "invalid",
        } satisfies Agent;
      }

      const binaryPath = lookup.stdout.trim();
      const versionLookup = await run(binaryPath, ["--version"]);
      const version = versionLookup.code === 0
        ? firstLine(versionLookup.stdout) ?? "installed"
        : "installed";

      return {
        id: definition.id,
        name: definition.name,
        status: "installed",
        version,
        binaryPath,
        resourcePaths: await getExistingResourcePaths(definition, home, pathExists),
        commandStatus: resolveCommandStatus(binaryPath, version),
      } satisfies Agent;
    }),
  );
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
  const output = await new Deno.Command(command, { args }).output();

  return {
    code: output.code,
    stdout: new TextDecoder().decode(output.stdout),
    stderr: new TextDecoder().decode(output.stderr),
  };
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
