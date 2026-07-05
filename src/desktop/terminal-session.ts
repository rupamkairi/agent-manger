import type { TerminalChunk } from "../shared/types/resource.ts";
import { resolveHomeDirectory } from "./runtime-env.ts";

export interface TerminalBootstrap {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export interface TerminalProcessLike {
  stdin: WritableStream<Uint8Array>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  status: Promise<Deno.CommandStatus>;
}

export type TerminalSpawner = (bootstrap: TerminalBootstrap) => TerminalProcessLike;
export type TerminalBootstrapFactory = () => TerminalBootstrap | Promise<TerminalBootstrap>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const maxChunks = 4000;

export function createTerminalBootstrap(home = Deno.env.get("HOME") ?? Deno.cwd()): TerminalBootstrap {
  return {
    command: "script",
    args: ["-q", "/dev/null", "/bin/bash", "-i"],
    cwd: home,
    env: {
      HOME: home,
      SHELL: "/bin/bash",
      TERM: "xterm-256color",
      COLUMNS: "120",
      LINES: "32",
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    },
  };
}

export function spawnTerminalProcess(bootstrap: TerminalBootstrap): TerminalProcessLike {
  return new Deno.Command(bootstrap.command, {
    args: bootstrap.args,
    cwd: bootstrap.cwd,
    env: bootstrap.env,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
}

export class TerminalSession {
  private process: TerminalProcessLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private startPromise: Promise<void> | null = null;
  private readonly output: TerminalChunk[] = [];
  private nextSeq = 1;

  constructor(
    private readonly spawnTerminal: TerminalSpawner = spawnTerminalProcess,
    private readonly bootstrapTerminal: TerminalBootstrapFactory = async () =>
      createTerminalBootstrap(await resolveHomeDirectory() || Deno.cwd()),
  ) {}

  async ensureStarted() {
    if (this.process) {
      return;
    }

    if (!this.startPromise) {
      this.startPromise = this.start();
    }

    await this.startPromise;
  }

  async write(data: string) {
    await this.ensureStarted();

    if (!this.writer) {
      return;
    }

    await this.writer.write(encoder.encode(data));
  }

  readSince(seq: number) {
    return this.output.filter((chunk) => chunk.seq > seq);
  }

  private async start() {
    const bootstrap = await this.bootstrapTerminal();
    const process = this.spawnTerminal(bootstrap);

    this.process = process;
    this.writer = process.stdin.getWriter();
    void this.pump(process.stdout);
    void this.pump(process.stderr);

    process.status.then(() => {
      this.process = null;
      this.writer = null;
      this.startPromise = null;
      this.enqueue("\r\n[terminal session ended]\r\n");
    });

    this.startPromise = null;
  }

  private async pump(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const text = decoder.decode(value, { stream: true });

        if (text) {
          this.enqueue(text);
        }
      }
    } finally {
      const tail = decoder.decode();

      if (tail) {
        this.enqueue(tail);
      }
    }
  }

  private enqueue(data: string) {
    this.output.push({ seq: this.nextSeq++, data });

    if (this.output.length > maxChunks) {
      this.output.splice(0, this.output.length - maxChunks);
    }
  }
}

export const terminalSession = new TerminalSession();
