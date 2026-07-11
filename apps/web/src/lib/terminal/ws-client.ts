import type { TerminalServerMessage } from "@weave/shared";

export type TerminalSocketStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface TerminalSocketHandlers {
	onOutput(data: Uint8Array): void;
	onReady(msg: { cols: number; rows: number; replayBytes: number }): void;
	onExit(code: number | null): void;
	onStatus(status: TerminalSocketStatus): void;
}

const UNKNOWN_SESSION_CLOSE_CODE = 4404;
const PING_INTERVAL_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;

export class TerminalSocket {
	private readonly sessionId: string;
	private readonly handlers: TerminalSocketHandlers;
	private socket: WebSocket | null = null;
	private pingTimer: ReturnType<typeof setInterval> | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectAttempt = 0;
	private intentionallyClosed = false;
	private stopReconnecting = false;

	constructor(sessionId: string, handlers: TerminalSocketHandlers) {
		this.sessionId = sessionId;
		this.handlers = handlers;
	}

	connect(): void {
		this.intentionallyClosed = false;
		this.openSocket(this.reconnectAttempt === 0 ? "connecting" : "reconnecting");
	}

	sendInput(data: string): void {
		this.send({ type: "input", data });
	}

	sendResize(cols: number, rows: number): void {
		this.send({ type: "resize", cols, rows });
	}

	close(): void {
		this.intentionallyClosed = true;
		this.stopReconnecting = true;
		this.clearTimers();
		this.socket?.close();
		this.socket = null;
	}

	private openSocket(status: TerminalSocketStatus): void {
		this.handlers.onStatus(status);

		const protocol = location.protocol === "https:" ? "wss" : "ws";
		const url = `${protocol}://${location.host}/ws/terminal?sessionId=${encodeURIComponent(this.sessionId)}`;

		const socket = new WebSocket(url);
		socket.binaryType = "arraybuffer";
		this.socket = socket;

		socket.addEventListener("open", () => {
			this.reconnectAttempt = 0;
			this.handlers.onStatus("open");
			this.startPing();
		});

		socket.addEventListener("message", (event) => {
			if (event.data instanceof ArrayBuffer) {
				this.handlers.onOutput(new Uint8Array(event.data));
				return;
			}
			this.handleTextMessage(String(event.data));
		});

		socket.addEventListener("close", (event) => {
			this.clearTimers();
			if (event.code === UNKNOWN_SESSION_CLOSE_CODE) {
				this.stopReconnecting = true;
			}
			if (this.intentionallyClosed || this.stopReconnecting) {
				this.handlers.onStatus("closed");
				return;
			}
			this.scheduleReconnect();
		});

		socket.addEventListener("error", () => {
			socket.close();
		});
	}

	private handleTextMessage(raw: string): void {
		let msg: TerminalServerMessage;
		try {
			msg = JSON.parse(raw) as TerminalServerMessage;
		} catch {
			return;
		}

		switch (msg.type) {
			case "ready":
				this.handlers.onReady({ cols: msg.cols, rows: msg.rows, replayBytes: msg.replayBytes });
				break;
			case "exit":
				this.stopReconnecting = true;
				this.clearTimers();
				this.handlers.onExit(msg.code);
				break;
			case "pong":
				break;
			case "error":
				break;
		}
	}

	private scheduleReconnect(): void {
		this.reconnectAttempt += 1;
		this.handlers.onStatus("reconnecting");
		const exp = Math.min(
			BASE_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempt - 1),
			MAX_RECONNECT_DELAY_MS,
		);
		const jitter = exp * 0.2 * (Math.random() * 2 - 1);
		const delay = Math.max(0, exp + jitter);

		this.reconnectTimer = setTimeout(() => {
			if (this.intentionallyClosed || this.stopReconnecting) return;
			this.openSocket("reconnecting");
		}, delay);
	}

	private startPing(): void {
		this.pingTimer = setInterval(() => {
			this.send({ type: "ping" });
		}, PING_INTERVAL_MS);
	}

	private clearTimers(): void {
		if (this.pingTimer !== null) {
			clearInterval(this.pingTimer);
			this.pingTimer = null;
		}
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private send(message: { type: string; [key: string]: unknown }): void {
		if (this.socket?.readyState !== WebSocket.OPEN) return;
		this.socket.send(JSON.stringify(message));
	}
}
