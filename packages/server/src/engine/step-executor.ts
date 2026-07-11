import type { AgentId } from "@weave/shared";
import type { JobLogStore } from "./log-store";

const KILL_GRACE_MS = 5_000;
const MAX_CAPTURE_CHARS = 4 * 1024 * 1024;

export interface StepExecution {
  jobId: string;
  agentId: AgentId;
  binaryPath?: string | null;
  prompt: string;
  cwd: string;
  timeoutMs: number;
  signal: AbortSignal;
}

export interface StepExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

function argv(input: StepExecution): string[] {
  const binary = input.binaryPath ?? (input.agentId === "claude-code" ? "claude" : input.agentId);
  if (input.agentId === "claude-code") return [binary, "-p", input.prompt, "--output-format", "text"];
  if (input.agentId === "codex") return [binary, "exec", input.prompt];
  return [binary, "run", input.prompt];
}

async function consume(
  stream: ReadableStream<Uint8Array>,
  name: "stdout" | "stderr",
  jobId: string,
  logs: JobLogStore,
): Promise<{ text: string; truncated: boolean }> {
  const decoder = new TextDecoder();
  let result = "";
  let truncated = false;
  for await (const chunk of stream) {
    const text = decoder.decode(chunk, { stream: true });
    result += text;
    if (result.length > MAX_CAPTURE_CHARS) {
      result = result.slice(-MAX_CAPTURE_CHARS);
      truncated = true;
    }
    await logs.append(jobId, name, text);
  }
  const tail = decoder.decode();
  if (tail) { result += tail; await logs.append(jobId, name, tail); }
  return { text: result, truncated };
}

export class StepExecutor {
  constructor(private readonly logs: JobLogStore) {}

  async execute(input: StepExecution): Promise<StepExecutionResult> {
    if (input.signal.aborted) throw new DOMException("Job cancelled", "AbortError");
    const detached = process.platform !== "win32";
    const subprocess = Bun.spawn(argv(input), {
      cwd: input.cwd,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
      detached,
    });
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const signalTree = (signal: "SIGTERM" | "SIGKILL") => {
      try {
        if (detached) process.kill(-subprocess.pid, signal);
        else subprocess.kill(signal);
      } catch {
        try { subprocess.kill(signal); } catch { /* already exited */ }
      }
    };
    const terminate = () => {
      signalTree("SIGTERM");
      killTimer = setTimeout(() => signalTree("SIGKILL"), KILL_GRACE_MS);
      killTimer.unref?.();
    };
    const onAbort = () => terminate();
    input.signal.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => { timedOut = true; terminate(); }, input.timeoutMs);
    timeout.unref?.();
    try {
      const stdoutPromise = consume(subprocess.stdout, "stdout", input.jobId, this.logs);
      const stderrPromise = consume(subprocess.stderr, "stderr", input.jobId, this.logs);
      const [exitCode, stdout, stderr] = await Promise.all([subprocess.exited, stdoutPromise, stderrPromise]);
      if (input.signal.aborted) throw new DOMException("Job cancelled", "AbortError");
      return {
        stdout: stdout.text,
        stderr: stderr.text,
        exitCode,
        timedOut,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
      };
    } finally {
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      input.signal.removeEventListener("abort", onAbort);
    }
  }
}
