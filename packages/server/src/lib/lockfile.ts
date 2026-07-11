import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface LockInfo {
  pid: number;
  port: number;
  startedAt: string;
}

export class LockHeldError extends Error {
  readonly holder: LockInfo;

  constructor(holder: LockInfo) {
    super(
      `Another Weave instance is running (pid ${holder.pid}, port ${holder.port}, started ${holder.startedAt})`,
    );
    this.name = "LockHeldError";
    this.holder = holder;
  }
}

function lockPathFor(weaveHome: string): string {
  return join(weaveHome, "weave.lock");
}

function parseLock(path: string): LockInfo | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LockInfo>;
    if (typeof parsed.pid !== "number") return null;
    return {
      pid: parsed.pid,
      port: typeof parsed.port === "number" ? parsed.port : 0,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : "",
    };
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // EPERM means the process exists but we lack permission to signal it.
    return code === "EPERM";
  }
}

function throwIfHeld(path: string): void {
  const existing = parseLock(path);
  if (existing && isProcessAlive(existing.pid)) {
    throw new LockHeldError(existing);
  }
}

/**
 * Acquires the single-instance lock at `<weaveHome>/weave.lock`.
 * Throws LockHeldError if a live process already holds it; stale locks
 * from dead processes are replaced. Returns the lock file path.
 */
export function acquireLock(weaveHome: string, port: number): string {
  const path = lockPathFor(weaveHome);
  throwIfHeld(path);

  const info: LockInfo = {
    pid: process.pid,
    port,
    startedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(info, null, 2);

  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  try {
    writeFileSync(path, payload, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    // Lost a creation race: re-check the new holder once.
    throwIfHeld(path);
    const holder = parseLock(path);
    throw new LockHeldError(
      holder ?? { pid: -1, port: 0, startedAt: "" },
    );
  }
  return path;
}

export function readLock(weaveHome: string): LockInfo | null {
  return parseLock(lockPathFor(weaveHome));
}

/**
 * Releases the lock, but only if this process still owns it.
 * Never throws — failures during shutdown are swallowed.
 */
export function releaseLock(lockPath: string): void {
  try {
    const existing = parseLock(lockPath);
    if (existing && existing.pid === process.pid) {
      unlinkSync(lockPath);
    }
  } catch {
    // ignore — best effort on shutdown
  }
}
