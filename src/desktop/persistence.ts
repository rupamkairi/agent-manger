import type { PersistedAppState, PersistedProject } from "../shared/types/resource.ts";

export const APP_STATE_VERSION = 1;
const APP_SUPPORT_DIR = "Library/Application Support/com.rupamkairi.ai-resource-manager";

export function getAppStatePath(home = Deno.env.get("HOME") ?? "") {
  return `${home.replace(/\/$/, "")}/${APP_SUPPORT_DIR}/state.json`;
}

export async function loadAppStateFile(path = getAppStatePath()): Promise<PersistedAppState | null> {
  try {
    const content = await Deno.readTextFile(path);
    return parseAppState(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }

    throw error;
  }
}

export async function saveAppStateFile(path = getAppStatePath(), state: PersistedAppState): Promise<void> {
  const directory = path.slice(0, path.lastIndexOf("/"));

  await Deno.mkdir(directory, { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(state, null, 2));
}

function parseAppState(content: string): PersistedAppState | null {
  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  let parsed: { version?: unknown; selectedProjectId?: unknown; projects?: unknown[] };

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.projects)) {
    return null;
  }

  const projects = parsed.projects
    .map(normalizePersistedProject)
    .filter((project: PersistedProject | null): project is PersistedProject => project !== null);

  return {
    version: typeof parsed.version === "number" ? parsed.version : APP_STATE_VERSION,
    selectedProjectId: typeof parsed.selectedProjectId === "string" ? parsed.selectedProjectId : null,
    projects,
  };
}

function normalizePersistedProject(project: unknown): PersistedProject | null {
  if (!project || typeof project !== "object") {
    return null;
  }

  const candidate = project as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.path !== "string" ||
    typeof candidate.lastScanned !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    path: candidate.path,
    lastScanned: candidate.lastScanned,
  };
}
