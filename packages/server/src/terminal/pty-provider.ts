/**
 * Thin adapter over whichever native PTY backend is available on this
 * machine. bun-pty (FFI, Bun-only) is preferred; node-pty is the fallback
 * for Bun builds where the bun-pty native lib isn't available. Both expose
 * near-identical `spawn(file, args, options) -> IPty` shapes, so a single
 * adapter covers them.
 */

export interface PtySpawnOpts {
  cwd: string;
  cols: number;
  rows: number;
  shell: string;
  env: Record<string, string>;
}

export interface PtySession {
  readonly pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(cb: (data: Uint8Array) => void): () => void;
  onExit(cb: (code: number | null) => void): () => void;
}

export interface PtyProvider {
  readonly name: "bun-pty" | "node-pty";
  spawn(opts: PtySpawnOpts): PtySession;
}

interface NativeIPty {
  readonly pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (event: { exitCode: number; signal?: number | string }) => void): {
    dispose(): void;
  };
}

type NativeSpawn = (file: string, args: string[], options: Record<string, unknown>) => NativeIPty;

const encoder = new TextEncoder();

function wrap(name: "bun-pty" | "node-pty", spawnFn: NativeSpawn): PtyProvider {
  return {
    name,
    spawn(opts: PtySpawnOpts): PtySession {
      const pty = spawnFn(opts.shell, [], {
        name: "xterm-256color",
        cols: opts.cols,
        rows: opts.rows,
        cwd: opts.cwd,
        env: opts.env,
      });
      return {
        get pid() {
          return pty.pid;
        },
        write(data: string) {
          pty.write(data);
        },
        resize(cols: number, rows: number) {
          pty.resize(cols, rows);
        },
        kill() {
          pty.kill();
        },
        onData(cb: (data: Uint8Array) => void): () => void {
          const disposable = pty.onData((chunk) => cb(encoder.encode(chunk)));
          return () => disposable.dispose();
        },
        onExit(cb: (code: number | null) => void): () => void {
          const disposable = pty.onExit((event) => cb(event.exitCode ?? null));
          return () => disposable.dispose();
        },
      };
    },
  };
}

/**
 * Dynamically load the best available PTY backend. Tries bun-pty first
 * (native FFI, no build step), then falls back to node-pty (native addon,
 * needs a prebuilt binary for the running platform/arch). Never throws;
 * returns null when neither is usable so callers can degrade gracefully.
 */
export async function loadPtyProvider(): Promise<PtyProvider | null> {
  try {
    const bunPty = (await import("bun-pty")) as unknown as { spawn: NativeSpawn };
    console.log("[terminal] loaded PTY provider: bun-pty");
    return wrap("bun-pty", bunPty.spawn);
  } catch {
    // fall through to node-pty
  }

  try {
    const nodePty = (await import("node-pty")) as unknown as { spawn: NativeSpawn };
    console.log("[terminal] loaded PTY provider: node-pty");
    return wrap("node-pty", nodePty.spawn);
  } catch {
    // fall through to unavailable
  }

  console.warn("[terminal] no PTY provider available (bun-pty and node-pty both failed to load)");
  return null;
}
