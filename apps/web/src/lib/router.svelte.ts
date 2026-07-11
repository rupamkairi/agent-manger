export interface RouteMatch<T = unknown> {
	path: string;
	params: Record<string, string>;
	route: T;
}

interface CompiledRoute<T> {
	pattern: string;
	segments: string[];
	route: T;
}

let currentPath = $state(window.location.pathname);

function onPopState() {
	currentPath = window.location.pathname;
}

if (typeof window !== "undefined") {
	window.addEventListener("popstate", onPopState);
}

export function getPath(): string {
	return currentPath;
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
	if (path === currentPath) return;
	if (opts.replace) {
		window.history.replaceState({}, "", path);
	} else {
		window.history.pushState({}, "", path);
	}
	currentPath = path;
}

export function link(node: HTMLAnchorElement) {
	function handleClick(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const href = node.getAttribute("href");
		if (!href || href.startsWith("http") || href.startsWith("//")) return;
		e.preventDefault();
		navigate(href);
	}
	node.addEventListener("click", handleClick);
	return {
		destroy() {
			node.removeEventListener("click", handleClick);
		},
	};
}

function compile<T>(pattern: string, route: T): CompiledRoute<T> {
	return { pattern, segments: pattern.split("/").filter(Boolean), route };
}

export function createMatcher<T>(routes: Array<{ path: string; route: T }>) {
	const compiled = routes.map((r) => compile(r.path, r.route));

	return function match(path: string): RouteMatch<T> | null {
		const parts = path.split("/").filter(Boolean);
		for (const c of compiled) {
			if (c.segments.length !== parts.length) continue;
			const params: Record<string, string> = {};
			let ok = true;
			for (let i = 0; i < c.segments.length; i++) {
				const seg = c.segments[i]!;
				const part = parts[i]!;
				if (seg.startsWith(":")) {
					params[seg.slice(1)] = decodeURIComponent(part);
				} else if (seg !== part) {
					ok = false;
					break;
				}
			}
			if (ok) return { path, params, route: c.route };
		}
		return null;
	};
}

export function currentPathGetter(): string {
	return currentPath;
}
