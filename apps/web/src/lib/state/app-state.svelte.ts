const STORAGE_KEY = "weave.selectedProjectId";

function readStored(): string | null {
	if (typeof localStorage === "undefined") return null;
	return localStorage.getItem(STORAGE_KEY);
}

let selectedProjectId = $state<string | null>(readStored());
let projectCatalogVersion = $state(0);
let resourceVersion = $state(0);

export function getSelectedProjectId(): string | null {
	return selectedProjectId;
}

export function setSelectedProjectId(id: string | null): void {
	selectedProjectId = id;
	if (typeof localStorage === "undefined") return;
	if (id) {
		localStorage.setItem(STORAGE_KEY, id);
	} else {
		localStorage.removeItem(STORAGE_KEY);
	}
}

/** Signals that the tracked-project catalog changed and dependent views should refresh. */
export function invalidateProjectCatalog(): void {
	projectCatalogVersion += 1;
}

export function getProjectCatalogVersion(): number {
	return projectCatalogVersion;
}

/** Signals that on-disk resources changed (write path) and list views should refetch. */
export function invalidateResources(): void {
	resourceVersion += 1;
}

export function getResourceVersion(): number {
	return resourceVersion;
}

/** Scope is "global" when no project is selected, "project" otherwise. */
export function currentScope(): "global" | "project" {
	return selectedProjectId ? "project" : "global";
}

/** Query params to filter resource lists by the current scope selection. */
export function scopeQueryParams(): { scope: "global" | "project"; projectId?: string } {
	if (selectedProjectId) {
		return { scope: "project", projectId: selectedProjectId };
	}
	return { scope: "global" };
}
