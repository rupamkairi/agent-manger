import { toast } from "svelte-sonner";
import { ApiError } from "$lib/api/client";

export interface Query<T> {
	readonly data: T | undefined;
	readonly loading: boolean;
	readonly error: string | null;
	refresh(): Promise<void>;
}

export interface CreateQueryOptions {
	/** Skip the initial toast on first load failure (still surfaces via `error`). */
	silent?: boolean;
}

export function createQuery<T>(
	fetcher: () => Promise<T>,
	options: CreateQueryOptions = {},
): Query<T> {
	let data = $state<T | undefined>(undefined);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let requestGeneration = 0;

	async function run() {
		const generation = ++requestGeneration;
		loading = true;
		error = null;
		try {
			const next = await fetcher();
			if (generation !== requestGeneration) return;
			data = next;
		} catch (err) {
			if (generation !== requestGeneration) return;
			const message = err instanceof ApiError ? err.message : "Something went wrong";
			error = message;
			if (!options.silent) {
				toast.error(message);
			}
		} finally {
			if (generation === requestGeneration) loading = false;
		}
	}

	run();

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		refresh: run,
	};
}
