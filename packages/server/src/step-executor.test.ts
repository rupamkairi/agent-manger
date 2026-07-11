import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { AgentId } from "@weave/shared";
import { AnsiSanitizer, buildStepArgv, StepExecutor, type StepExecution } from "./engine/step-executor";

afterEach(() => mock.restore());

function execution(agentId: AgentId): StepExecution {
  return {
    jobId: "job-1",
    agentId,
    binaryPath: agentId === "claude-code" ? "/bin/claude" : `/bin/${agentId}`,
    prompt: "Inspect this repository",
    cwd: "/tmp/target-project",
    timeoutMs: 1_000,
    signal: new AbortController().signal,
  };
}

describe("step executor commands", () => {
  it("passes the workflow project path explicitly to OpenCode", () => {
    expect(buildStepArgv(execution("opencode"))).toEqual([
      "/bin/opencode", "run", "--dir", "/tmp/target-project", "Inspect this repository",
    ]);
  });

  it("leaves Codex and Claude Code commands unchanged", () => {
    expect(buildStepArgv(execution("codex"))).toEqual(["/bin/codex", "exec", "Inspect this repository"]);
    expect(buildStepArgv(execution("claude-code"))).toEqual([
      "/bin/claude", "-p", "Inspect this repository", "--output-format", "text",
    ]);
  });
});

describe("OpenCode ANSI sanitization", () => {
  it("removes formatting while preserving text and Unicode status symbols", () => {
    const sanitizer = new AnsiSanitizer();
    expect(sanitizer.write("\u001b[0m✓ \u001b[90mExplore\u001b[0m → • ✱\nplain error")).toBe(
      "✓ Explore → • ✱\nplain error",
    );
  });

  it("removes an ANSI sequence split across chunks", () => {
    const sanitizer = new AnsiSanitizer();
    expect(sanitizer.write("before\u001b[9")).toBe("before");
    expect(sanitizer.write("0mafter\u001b")).toBe("after");
    expect(sanitizer.write("[0m done")).toBe(" done");
    expect(sanitizer.end()).toBe("");
  });

  it("uses the workflow cwd and persists only sanitized stdout and stderr", async () => {
    const encode = (parts: string[]) => new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
        controller.close();
      },
    });
    const spawn = spyOn(Bun, "spawn").mockReturnValue({
      pid: 123,
      stdout: encode(["\u001b[0", "m✓ done\n"]),
      stderr: encode(["\u001b[90mplain error\u001b[0m"]),
      exited: Promise.resolve(0),
      kill() {},
    } as never);
    const appended: Array<[string, string, string]> = [];
    const logs = {
      append: async (jobId: string, stream: string, text: string) => { appended.push([jobId, stream, text]); },
    };

    const result = await new StepExecutor(logs as never).execute(execution("opencode"));

    expect(spawn.mock.calls[0]?.[1]).toMatchObject({ cwd: "/tmp/target-project" });
    expect(result.stdout).toBe("✓ done\n");
    expect(result.stderr).toBe("plain error");
    expect(appended.filter((entry) => entry[1] === "stdout").map((entry) => entry[2]).join("")).toBe("✓ done\n");
    expect(appended.filter((entry) => entry[1] === "stderr").map((entry) => entry[2]).join("")).toBe("plain error");
    expect(appended.some((entry) => entry[2].includes("\u001b"))).toBe(false);
  });
});
