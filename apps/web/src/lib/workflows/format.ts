import type { Job, JobState, ScheduleSpec } from "@weave/shared";

export function formatDateTime(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function formatDuration(job: Pick<Job, "startedAt" | "endedAt">): string {
	if (!job.startedAt) return "—";
	const start = new Date(job.startedAt).getTime();
	const end = job.endedAt ? new Date(job.endedAt).getTime() : Date.now();
	if (!Number.isFinite(start) || !Number.isFinite(end)) return "—";
	const seconds = Math.max(0, Math.round((end - start) / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	if (minutes < 60) return `${minutes}m ${rest}s`;
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatScheduleSpec(spec: ScheduleSpec): string {
	if (spec.kind === "once") return `Once · ${formatDateTime(spec.at)}`;
	if (spec.kind === "interval") {
		const minutes = spec.everyMs / 60_000;
		return minutes >= 60 && minutes % 60 === 0
			? `Every ${minutes / 60} hour${minutes === 60 ? "" : "s"}`
			: `Every ${minutes} minute${minutes === 1 ? "" : "s"}`;
	}
	return `${spec.expr}${spec.tz ? ` · ${spec.tz}` : ""}`;
}

export function isActiveState(state: JobState): boolean {
	return state === "queued" || state === "running";
}
