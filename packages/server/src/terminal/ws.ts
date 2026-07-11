import type { Server, WebSocketHandler } from "bun";
import { TerminalServiceError, type TerminalSessionManager, type TerminalWsData } from "./session-manager";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function extractHostname(hostHeader: string): string {
  // Host headers may be "host:port" or "[::1]:port"; strip the port.
  const bracketed = hostHeader.match(/^\[(.+)\]/);
  if (bracketed) return bracketed[1]!;
  return hostHeader.split(":")[0]!;
}

/**
 * Local-only guard for the terminal WebSocket upgrade. Terminal sessions
 * grant shell access, so we refuse any request that didn't originate from
 * the local machine.
 */
export function isLocalOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host || !LOCAL_HOSTNAMES.has(extractHostname(host))) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const url = new URL(origin);
    return LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Attempts to upgrade a request matched to the /ws/terminal path into a
 * WebSocket connection. Returns a Response for any case that should short
 * circuit (rejected origin, unavailable provider, bad/missing session),
 * or undefined once `server.upgrade` has taken over the request.
 */
export function tryUpgradeTerminal(
  request: Request,
  url: URL,
  server: Server<TerminalWsData>,
  manager: TerminalSessionManager,
): Response | undefined {
  if (!isLocalOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!manager.available) {
    return new Response("Terminal support is unavailable on this server", { status: 503 });
  }
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId query parameter", { status: 400 });
  }
  if (!manager.has(sessionId)) {
    return new Response("Terminal session not found", { status: 404 });
  }

  const upgraded = server.upgrade(request, { data: { sessionId } });
  if (!upgraded) {
    return new Response("WebSocket upgrade failed", { status: 400 });
  }
  return undefined;
}

export function terminalWebSocketHandler(
  manager: TerminalSessionManager,
): WebSocketHandler<TerminalWsData> {
  return {
    open(ws) {
      try {
        manager.attach(ws.data.sessionId, ws);
      } catch (error) {
        const message =
          error instanceof TerminalServiceError ? error.message : "Failed to attach to session";
        ws.send(JSON.stringify({ type: "error", code: "session_not_found", message }));
        ws.close(4404, "session not found");
      }
    },
    message(ws, message) {
      manager.handleMessage(ws.data.sessionId, ws, message);
    },
    close(ws) {
      manager.detach(ws.data.sessionId, ws);
    },
  };
}
