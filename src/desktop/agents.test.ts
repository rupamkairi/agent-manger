import { buildShellCommand, checkAgentCommands, detectAgents } from "./agents.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("detectAgents reports installed agents with real version text and resource paths", async () => {
  const agents = await detectAgents(
    async (command, args) => {
      if (command === "command" && args[0] === "-v" && args[1] === "codex") {
        return { code: 0, stdout: "/usr/local/bin/codex\n", stderr: "" };
      }

      if (command === "/usr/local/bin/codex" && args[0] === "--version") {
        return { code: 0, stdout: "codex 2.3.4\n", stderr: "" };
      }

      return { code: 1, stdout: "", stderr: "missing" };
    },
    async (path) => path === "/Users/tester/.codex/skills" || path === "/Users/tester/.codex/memories",
    "/Users/tester",
  );

  const codex = agents.find((agent) => agent.id === "codex");

  if (!codex) {
    throw new Error("Expected Codex agent");
  }

  assertEquals(codex.status, "installed");
  assertEquals(codex.binaryPath, "/usr/local/bin/codex");
  assertEquals(codex.version, "codex 2.3.4");
  assertEquals(codex.commandStatus, "valid");
  assertEquals(codex.resourcePaths.length, 2);
  assertEquals(codex.resourcePaths[0], "/Users/tester/.codex/skills");
  assertEquals(codex.resourcePaths[1], "/Users/tester/.codex/memories");
});

Deno.test("checkAgentCommands marks missing agent when command is absent", async () => {
  const agents = await checkAgentCommands(async () => ({
    code: 1,
    stdout: "",
    stderr: "missing",
  }), async () => false, "/Users/tester");

  const claude = agents.find((agent) => agent.id === "claude");

  if (!claude) {
    throw new Error("Expected Claude agent");
  }

  assertEquals(claude.status, "missing");
  assertEquals(claude.binaryPath, "Not found");
  assertEquals(claude.version, "unknown");
  assertEquals(claude.commandStatus, "invalid");
});

Deno.test("checkAgentCommands keeps installed agents unknown when version lookup fails", async () => {
  const agents = await checkAgentCommands(
    async (command, args) => {
      if (command === "command" && args[0] === "-v" && args[1] === "opencode") {
        return { code: 0, stdout: "/opt/homebrew/bin/opencode\n", stderr: "" };
      }

      if (command === "/opt/homebrew/bin/opencode" && args[0] === "--version") {
        return { code: 1, stdout: "", stderr: "unsupported" };
      }

      return { code: 1, stdout: "", stderr: "missing" };
    },
    async () => false,
    "/Users/tester",
  );

  const opencode = agents.find((agent) => agent.id === "opencode");

  if (!opencode) {
    throw new Error("Expected OpenCode agent");
  }

  assertEquals(opencode.status, "installed");
  assertEquals(opencode.binaryPath, "/opt/homebrew/bin/opencode");
  assertEquals(opencode.version, "unknown");
  assertEquals(opencode.commandStatus, "warning");
});

Deno.test("buildShellCommand escapes shell tokens", () => {
  assertEquals(buildShellCommand("command", ["-v", "codex"]), "command -v codex");
  assertEquals(
    buildShellCommand("/Applications/Claude Code/bin/claude", ["--version"]),
    "'/Applications/Claude Code/bin/claude' --version",
  );
});
