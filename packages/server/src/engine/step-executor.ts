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

export function buildStepArgv(input: StepExecution): string[] {
  const binary = input.binaryPath ?? (input.agentId === "claude-code" ? "claude" : input.agentId);
  if (input.agentId === "claude-code") return [binary, "-p", input.prompt, "--output-format", "text"];
  if (input.agentId === "codex") return [binary, "exec", input.prompt];
  return [binary, "run", "--dir", input.cwd, input.prompt];
}

const COMPLETE_ANSI_SEQUENCE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const INCOMPLETE_ANSI_SEQUENCE = /\x1b(?:\[[0-?]*[ -/]*)?$/;

export class AnsiSanitizer {
  private pending = "";

  write(chunk: string): string {
    let text = this.pending + chunk;
    this.pending = "";
    const trailingEscape = text.match(INCOMPLETE_ANSI_SEQUENCE);
    if (trailingEscape?.index !== undefined) {
      this.pending = trailingEscape[0];
      text = text.slice(0, trailingEscape.index);
    }
    return text.replace(COMPLETE_ANSI_SEQUENCE, "");
  }

  end(): string {
    this.pending = "";
    return "";
  }
}

async function consume(
  stream: ReadableStream<Uint8Array>,
  name: "stdout" | "stderr",
  jobId: string,
  logs: JobLogStore,
  sanitizeAnsi: boolean,
): Promise<{ text: string; truncated: boolean }> {
  const decoder = new TextDecoder();
  const sanitizer = sanitizeAnsi ? new AnsiSanitizer() : null;
  let result = "";
  let truncated = false;
  for await (const chunk of stream) {
    const decoded = decoder.decode(chunk, { stream: true });
    const text = sanitizer?.write(decoded) ?? decoded;
    result += text;
    if (result.length > MAX_CAPTURE_CHARS) {
      result = result.slice(-MAX_CAPTURE_CHARS);
      truncated = true;
    }
    if (text) await logs.append(jobId, name, text);
  }
  const decodedTail = decoder.decode();
  const tail = sanitizer ? sanitizer.write(decodedTail) + sanitizer.end() : decodedTail;
  if (tail) { result += tail; await logs.append(jobId, name, tail); }
  return { text: result, truncated };
}

export class StepExecutor {
  constructor(private readonly logs: JobLogStore) {}

  async execute(input: StepExecution): Promise<StepExecutionResult> {
    if (input.signal.aborted) throw new DOMException("Job cancelled", "AbortError");
    const detached = process.platform !== "win32";
    const subprocess = Bun.spawn(buildStepArgv(input), {
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
      const sanitizeAnsi = input.agentId === "opencode";
      const stdoutPromise = consume(subprocess.stdout, "stdout", input.jobId, this.logs, sanitizeAnsi);
      const stderrPromise = consume(subprocess.stderr, "stderr", input.jobId, this.logs, sanitizeAnsi);
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
