import { checkAgentCommands } from "./agents.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("checkAgentCommands marks installed agent when binary and version exist", async () => {
  const agents = await checkAgentCommands(async (command, args) => {
    if (command === "which" && args[0] === "claude") {
      return { code: 0, stdout: "/usr/local/bin/claude\n", stderr: "" };
    }

    if (command === "/usr/local/bin/claude" && args[0] === "--version") {
      return { code: 0, stdout: "claude 1.2.3\n", stderr: "" };
    }

    return { code: 1, stdout: "", stderr: "missing" };
  }, async () => false, "/Users/tester");

  const claude = agents.find((agent) => agent.id === "claude");

  if (!claude) {
    throw new Error("Expected Claude agent");
  }

  assertEquals(claude.status, "installed");
  assertEquals(claude.binaryPath, "/usr/local/bin/claude");
  assertEquals(claude.version, "claude 1.2.3");
  assertEquals(claude.commandStatus, "valid");
});

Deno.test("checkAgentCommands marks missing agent when command is absent", async () => {
  const agents = await checkAgentCommands(async () => ({
    code: 1,
    stdout: "",
    stderr: "missing",
  }), async () => false, "/Users/tester");

  const codex = agents.find((agent) => agent.id === "codex");

  if (!codex) {
    throw new Error("Expected Codex agent");
  }

  assertEquals(codex.status, "missing");
  assertEquals(codex.binaryPath, "Not found");
  assertEquals(codex.version, "unknown");
  assertEquals(codex.commandStatus, "invalid");
});

Deno.test("checkAgentCommands keeps installed state when version lookup fails", async () => {
  const agents = await checkAgentCommands(async (command, args) => {
    if (command === "which" && args[0] === "opencode") {
      return { code: 0, stdout: "/opt/homebrew/bin/opencode\n", stderr: "" };
    }

    if (command === "/opt/homebrew/bin/opencode" && args[0] === "--version") {
      return { code: 1, stdout: "", stderr: "unsupported" };
    }

    return { code: 1, stdout: "", stderr: "missing" };
  }, async () => false, "/Users/tester");

  const opencode = agents.find((agent) => agent.id === "opencode");

  if (!opencode) {
    throw new Error("Expected OpenCode agent");
  }

  assertEquals(opencode.status, "installed");
  assertEquals(opencode.binaryPath, "/opt/homebrew/bin/opencode");
  assertEquals(opencode.version, "installed");
  assertEquals(opencode.commandStatus, "valid");
});
