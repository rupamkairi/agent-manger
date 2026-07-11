import type { z } from "zod";

const API_BASE = "/api/v1";

export class ApiError extends Error {
	code: string;
	details?: unknown;

	constructor(code: string, message: string, details?: unknown) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.details = details;
	}
}

interface Envelope<T> {
	ok: boolean;
	data?: T;
	error?: { code: string; message: string; details?: unknown };
}

export async function fetchJson<T>(
	path: string,
	schema: z.ZodType<T>,
	init?: RequestInit,
): Promise<T> {
	let res: Response;
	try {
		res = await fetch(`${API_BASE}${path}`, {
			headers: { "Content-Type": "application/json", ...init?.headers },
			...init,
		});
	} catch (err) {
		throw new ApiError("internal", "Network request failed", err);
	}

	let body: Envelope<unknown>;
	try {
		body = (await res.json()) as Envelope<unknown>;
	} catch (err) {
		throw new ApiError("internal", "Invalid JSON response from server", err);
	}

	if (!body.ok) {
		const error = body.error ?? { code: "internal", message: "Unknown error" };
		throw new ApiError(error.code, error.message, error.details);
	}

	const parsed = schema.safeParse(body.data);
	if (!parsed.success) {
		throw new ApiError(
			"validation_failed",
			"Response failed schema validation",
			parsed.error.issues,
		);
	}

	return parsed.data;
}

export function toQueryString<T extends object>(params: T): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (value !== undefined && value !== null && value !== "") {
			search.set(key, String(value));
		}
	}
	const qs = search.toString();
	return qs ? `?${qs}` : "";
}
