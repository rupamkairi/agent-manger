const API_BASE = "/api/v1";

export interface JobEventPayload {
	type?: string;
	jobId?: string;
	state?: string;
	[key: string]: unknown;
}

export interface JobLogPayload {
	jobId: string;
	stream: "stdout" | "stderr";
	chunk: string;
	offset: number;
}

function connect<T>(path: string, eventNames: string[], onData: (data: T) => void, onError?: () => void): () => void {
	const source = new EventSource(`${API_BASE}${path}`);
	const handle = (event: MessageEvent<string>) => {
		try {
			onData(JSON.parse(event.data) as T);
		} catch {
			// A malformed event should not terminate an otherwise healthy stream.
		}
	};
	source.onmessage = handle;
	for (const eventName of eventNames) source.addEventListener(eventName, handle as EventListener);
	source.onerror = () => onError?.();
	return () => source.close();
}

export function subscribeToJobEvents(
	jobId: string,
	onData: (event: JobEventPayload) => void,
	onError?: () => void,
): () => void {
	return connect(`/jobs/${encodeURIComponent(jobId)}/events`, ["snapshot", "state"], onData, onError);
}

export function subscribeToJobLogs(
	jobId: string,
	onData: (event: JobLogPayload) => void,
	onError?: () => void,
): () => void {
	return connect(`/jobs/${encodeURIComponent(jobId)}/logs?follow=1`, ["log"], onData, onError);
}

export function jobLogDownloadUrl(jobId: string): string {
	return `${API_BASE}/jobs/${encodeURIComponent(jobId)}/logs`;
}

export async function downloadJobLogs(jobId: string): Promise<void> {
	const response = await fetch(jobLogDownloadUrl(jobId));
	if (!response.ok) throw new Error("Could not download job logs");
	const sse = await response.text();
	const text = sse
		.split("\n")
		.filter((line) => line.startsWith("data: "))
		.map((line) => {
			try {
				const event = JSON.parse(line.slice(6)) as JobLogPayload & { jobId?: string };
				return `[${event.jobId ?? jobId}] [${event.stream}]\n${event.chunk}`;
			} catch {
				return "";
			}
		})
		.filter(Boolean)
		.join("\n");
	const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `weave-job-${jobId}.log`;
	anchor.click();
	URL.revokeObjectURL(url);
}
