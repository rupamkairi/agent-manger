import type { ServerWebSocket } from "bun";
import {
  TerminalClientMessageSchema,
  type TerminalServerMessage,
  type TerminalSession,
} from "@weave/shared";
import type { Db } from "../db/client";
import { loadEnv } from "../env";
import { getProjectRow } from "../services/projects";
import { ByteRingBuffer } from "./ring-buffer";
import type { PtyProvider, PtySession } from "./pty-provider";
import { loadPtyProvider } from "./pty-provider";

export interface TerminalWsData {
  sessionId: string;
}
export type TerminalWs = ServerWebSocket<TerminalWsData>;

export class TerminalServiceError extends Error {
  constructor(
    readonly kind: "unavailable" | "not_found" | "limit_exceeded" | "validation_failed",
    message: string,
  ) {
    super(message);
    this.name = "TerminalServiceError";
  }
}

interface Session {
  id: string;
  projectId: string | null;
  cwd: string;
  shell: string;
  pty: PtySession;
  ring: ByteRingBuffer;
  clients: Set<TerminalWs>;
  cols: number;
  rows: number;
  createdAt: string;
  lastActivityAt: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
  unsubscribers: Array<() => void>;
  exited: Promise<void>;
  resolveExited: () => void;
}

export interface TerminalSessionManagerOpts {
  idleTimeoutMs?: number;
  ringCapacity?: number;
  maxSessions?: number;
  weaveHome?: string;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60_000;
const DEFAULT_RING_CAPACITY = 64 * 1024;
const DEFAULT_MAX_SESSIONS = 20;
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const KILL_WAIT_MS = 3_000;

function sendText(ws: TerminalWs, message: TerminalServerMessage): void {
  ws.send(JSON.stringify(message));
}

export class TerminalSessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly idleTimeoutMs: number;
  private readonly ringCapacity: number;
  private readonly maxSessions: number;
  private readonly weaveHome: string;

  constructor(
    private readonly db: Db,
    private readonly provider: PtyProvider | null,
    opts: TerminalSessionManagerOpts = {},
  ) {
    this.idleTimeoutMs = opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.ringCapacity = opts.ringCapacity ?? DEFAULT_RING_CAPACITY;
    this.maxSessions = opts.maxSessions ?? DEFAULT_MAX_SESSIONS;
    this.weaveHome = opts.weaveHome ?? loadEnv().weaveHome;
  }

  get available(): boolean {
    return this.provider !== null;
  }

  get providerName(): "bun-pty" | "node-pty" | null {
    return this.provider?.name ?? null;
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /** Boot-time cleanup: no session survives a server restart. */
  async purgeAllRows(): Promise<void> {
    await this.db.run("DELETE FROM terminal_sessions");
  }

  list(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((session) => toTerminalSession(session));
  }

  async create(input: { projectId: string | null }): Promise<TerminalSession> {
    if (!this.provider) {
      throw new TerminalServiceError("unavailable", "No PTY provider is available");
    }
    if (this.sessions.size >= this.maxSessions) {
      throw new TerminalServiceError(
        "limit_exceeded",
        `Maximum number of terminal sessions (${this.maxSessions}) reached`,
      );
    }

    const cwd = await this.resolveCwd(input.projectId);
    const shell = process.env.SHELL ?? "/bin/zsh";
    const env = buildEnv();
    const cols = DEFAULT_COLS;
    const rows = DEFAULT_ROWS;

    const id = crypto.randomUUID();
    const pty = this.provider.spawn({ cwd, cols, rows, shell, env });
    const ring = new ByteRingBuffer(this.ringCapacity);
    const now = new Date().toISOString();

    let resolveExited!: () => void;
    const exited = new Promise<void>((resolve) => {
      resolveExited = resolve;
    });
    const session: Session = {
      id,
      projectId: input.projectId,
      cwd,
      shell,
      pty,
      ring,
      clients: new Set(),
      cols,
      rows,
      createdAt: now,
      lastActivityAt: now,
      idleTimer: null,
      unsubscribers: [],
      exited,
      resolveExited,
    };

    const unsubData = pty.onData((data) => {
      ring.push(data);
      this.broadcastBinary(session, data);
      this.touch(session);
    });
    const unsubExit = pty.onExit((code) => {
      this.broadcastText(session, { type: "exit", code });
      for (const ws of session.clients) {
        ws.close(1000, "session exited");
      }
      this.cleanup(session).catch((error) => {
        console.error(`Failed to clean up terminal session ${session.id}:`, error);
      });
    });
    session.unsubscribers.push(unsubData, unsubExit);

    this.sessions.set(id, session);
    await this.db.run(
      "INSERT INTO terminal_sessions (id, project_id, cwd, shell, pid, created_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, input.projectId, cwd, shell, pty.pid, now, now],
    );

    this.armIdleTimer(session);
    return toTerminalSession(session);
  }

  attach(sessionId: string, ws: TerminalWs): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new TerminalServiceError("not_found", `Terminal session not found: ${sessionId}`);
    }
    session.clients.add(ws);
    sendText(ws, {
      type: "ready",
      sessionId: session.id,
      cols: session.cols,
      rows: session.rows,
      replayBytes: session.ring.size,
    });
    const snapshot = session.ring.snapshot();
    if (snapshot.length > 0) {
      ws.sendBinary(snapshot);
    }
    this.touch(session);
  }

  detach(sessionId: string, ws: TerminalWs): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.clients.delete(ws);
  }

  handleMessage(sessionId: string, ws: TerminalWs, raw: string | Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (typeof raw !== "string") return; // binary frames aren't expected from clients

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendText(ws, { type: "error", code: "invalid_message", message: "Message is not valid JSON" });
      return;
    }

    const result = TerminalClientMessageSchema.safeParse(parsed);
    if (!result.success) {
      sendText(ws, {
        type: "error",
        code: "validation_failed",
        message: "Message failed validation",
      });
      return;
    }

    const message = result.data;
    switch (message.type) {
      case "input":
        session.pty.write(message.data);
        this.touch(session);
        break;
      case "resize":
        session.pty.resize(message.cols, message.rows);
        session.cols = message.cols;
        session.rows = message.rows;
        this.touch(session);
        break;
      case "ping":
        sendText(ws, { type: "pong" });
        break;
    }
  }

  async kill(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.pty.kill();
    // Wait for the PTY's onExit-driven cleanup so callers (shutdown ordering,
    // delete route) observe a fully torn-down session; a hung child must not
    // stall the caller forever, hence the grace timeout.
    await Promise.race([
      session.exited,
      new Promise<void>((resolve) => setTimeout(resolve, KILL_WAIT_MS).unref?.()),
    ]);
    return true;
  }

  async shutdown(): Promise<void> {
    await Promise.all(Array.from(this.sessions.keys()).map((id) => this.kill(id)));
  }

  private async resolveCwd(projectId: string | null): Promise<string> {
    if (projectId === null) return this.weaveHome;
    const row = await getProjectRow(this.db, projectId);
    if (!row) {
      throw new TerminalServiceError("not_found", `Project not found: ${projectId}`);
    }
    return row.root_path;
  }

  private touch(session: Session): void {
    session.lastActivityAt = new Date().toISOString();
    this.armIdleTimer(session);
  }

  private armIdleTimer(session: Session): void {
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => {
      session.pty.kill();
    }, this.idleTimeoutMs);
    session.idleTimer.unref?.();
  }

  private broadcastBinary(session: Session, data: Uint8Array): void {
    for (const ws of session.clients) {
      ws.sendBinary(data);
    }
  }

  private broadcastText(session: Session, message: TerminalServerMessage): void {
    const payload = JSON.stringify(message);
    for (const ws of session.clients) {
      ws.send(payload);
    }
  }

  private async cleanup(session: Session): Promise<void> {
    if (session.idleTimer) clearTimeout(session.idleTimer);
    for (const unsub of session.unsubscribers) unsub();
    session.clients.clear();
    this.sessions.delete(session.id);
    try {
      await this.db.run("DELETE FROM terminal_sessions WHERE id = ?", [session.id]);
    } finally {
      session.resolveExited();
    }
  }
}

function buildEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  return env;
}

function toTerminalSession(session: Session): TerminalSession {
  return {
    id: session.id,
    projectId: session.projectId,
    cwd: session.cwd,
    shell: session.shell,
    pid: session.pty.pid,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
  };
}

const managers = new WeakMap<object, TerminalSessionManager>();

export async function initTerminalManager(db: Db): Promise<TerminalSessionManager> {
  const existing = managers.get(db as object);
  if (existing) return existing;
  const provider = await loadPtyProvider();
  const manager = new TerminalSessionManager(db, provider);
  await manager.purgeAllRows();
  managers.set(db as object, manager);
  return manager;
}

export function getTerminalManager(db: Db): TerminalSessionManager {
  const existing = managers.get(db as object);
  if (!existing) {
    throw new Error("Terminal manager not initialized; call initTerminalManager first");
  }
  return existing;
}
