import type { PersistedAppState, PersistedProject } from "../shared/types/resource.ts";
import { normalizeHomeDirectory } from "./runtime-env.ts";

export const APP_STATE_VERSION = 1;
const APP_SUPPORT_DIR = "Library/Application Support/com.rupamkairi.agent-manager";
const PROJECTS_KEY = ["app", "projects"] as const;
const SELECTED_PROJECT_ID_KEY = ["app", "selectedProjectId"] as const;
const VERSION_KEY = ["app", "version"] as const;

export function getAppDatabasePath(home = Deno.env.get("HOME") ?? "") {
  const normalizedHome = normalizeHomeDirectory(home);
  return `${normalizedHome}/${APP_SUPPORT_DIR}/agent-manager.sqlite`;
}

export async function loadAppStateFile(path = getAppDatabasePath()): Promise<PersistedAppState | null> {
  try {
    await Deno.stat(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }

    throw error;
  }

  const kv = await Deno.openKv(path);

  try {
    const [versionEntry, projectsEntry, selectedProjectEntry] = await Promise.all([
      kv.get<number>(VERSION_KEY),
      kv.get<unknown>(PROJECTS_KEY),
      kv.get<unknown>(SELECTED_PROJECT_ID_KEY),
    ]);

    const projects = normalizePersistedProjects(projectsEntry.value);

    if (projects.length === 0) {
      return null;
    }

    const selectedProjectId = normalizeSelectedProjectId(selectedProjectEntry.value, projects);

    return {
      version: typeof versionEntry.value === "number" ? versionEntry.value : APP_STATE_VERSION,
      selectedProjectId,
      projects,
    };
  } finally {
    kv.close();
  }
}

export async function saveAppStateFile(path = getAppDatabasePath(), state: PersistedAppState): Promise<void> {
  const directory = path.slice(0, path.lastIndexOf("/"));

  await Deno.mkdir(directory, { recursive: true });

  const kv = await Deno.openKv(path);

  try {
    await kv.atomic()
      .set(VERSION_KEY, state.version)
      .set(PROJECTS_KEY, state.projects.map(normalizePersistedProject).filter((project): project is PersistedProject => project !== null))
      .set(SELECTED_PROJECT_ID_KEY, normalizeSelectedProjectId(state.selectedProjectId, state.projects))
      .commit();
  } finally {
    kv.close();
  }
}

function normalizePersistedProjects(projects: unknown): PersistedProject[] {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects
    .map(normalizePersistedProject)
    .filter((project): project is PersistedProject => project !== null);
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

function normalizeSelectedProjectId(selectedProjectId: unknown, projects: PersistedProject[]) {
  if (typeof selectedProjectId !== "string") {
    return null;
  }

  return projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : projects[0]?.id ?? null;
}
