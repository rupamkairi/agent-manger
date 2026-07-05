import type { PersistedAppState, PersistedProject, Project, Skill, Warning } from "../../../shared/types/resource.ts";

export type SkillsTabId = "All" | "Global" | "Project";

export function restoreProjects(state: PersistedAppState | null) {
  const projects = (state?.projects ?? []).map(fromPersistedProject);

  return {
    projects,
    selectedProjectId: resolveSelectedProjectId(state?.selectedProjectId ?? null, projects),
  };
}

export function fromPersistedProject(project: PersistedProject): Project {
  return {
    id: project.id,
    name: project.name,
    path: project.path,
    environment: "local",
    lastScanned: project.lastScanned,
    agentCount: 0,
    skillCount: 0,
    instructionCount: 0,
    warningCount: 0,
  };
}

export function toPersistedProject(project: Project): PersistedProject {
  return {
    id: project.id,
    name: project.name,
    path: project.path,
    lastScanned: project.lastScanned,
  };
}

export function resolveSelectedProjectId(selectedProjectId: string | null, projects: Project[]) {
  if (!selectedProjectId) {
    return projects[0]?.id ?? null;
  }

  return projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : projects[0]?.id ?? null;
}

export function findProjectById(projects: Project[], projectId: string | null) {
  if (!projectId) {
    return null;
  }

  return projects.find((project) => project.id === projectId) ?? null;
}

export function normalizeSkillInventory(skills: Skill[]) {
  const counts = new Map<string, number>();

  for (const skill of skills) {
    const key = normalizeSkillName(skill.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return skills.map((skill) => ({
    ...skill,
    duplicateName: (counts.get(normalizeSkillName(skill.name)) ?? 0) > 1,
  }));
}

export function buildDuplicateSkillWarnings(skills: Skill[]): Warning[] {
  const groups = new Map<string, Skill[]>();

  for (const skill of skills) {
    const key = normalizeSkillName(skill.name);
    const existing = groups.get(key) ?? [];
    existing.push(skill);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      id: `duplicate-skill-${key}`,
      severity: "warning",
      resource: group[0]?.name ?? "Skill",
      reason: `Duplicate skill name across ${group.length} locations.`,
      suggestedFix: "Rename one of the skill folders or manifests.",
      time: "local",
    }));
}

export function filterSkillsForTab(skills: Skill[], tab: SkillsTabId, selectedProjectId: string | null) {
  if (tab === "Global") {
    return skills.filter((skill) => skill.scope === "global");
  }

  if (tab === "Project") {
    if (!selectedProjectId) {
      return [];
    }

    return skills.filter((skill) => skill.sourceProjectId === selectedProjectId);
  }

  return skills;
}

export function resolveSelectedSkillId(skills: Skill[], selectedSkillId: string | null) {
  if (!selectedSkillId) {
    return skills[0]?.id ?? null;
  }

  return skills.some((skill) => skill.id === selectedSkillId) ? selectedSkillId : skills[0]?.id ?? null;
}

export function describeSkillsEmptyState(
  allSkills: Skill[],
  visibleSkills: Skill[],
  tab: SkillsTabId,
  warnings: Warning[],
) {
  if (allSkills.length === 0) {
    const diagnostic = warnings.find((warning) =>
      warning.category === "permission-denied" || warning.category === "home-unresolved" || warning.category === "root-missing"
    );

    if (diagnostic) {
      return {
        title: diagnostic.category === "permission-denied"
          ? "Skill scan blocked"
          : diagnostic.category === "home-unresolved"
          ? "Global home unresolved"
          : "No skill roots found",
        description: diagnostic.reason,
      };
    }

    return {
      title: "No skills detected",
      description: "Add a project or global skill root and rescan to populate the inventory.",
    };
  }

  if (visibleSkills.length === 0 && tab === "Project") {
    return {
      title: "No project skills for selected project",
      description: "Select a project in the sidebar or add supported project skill folders and rescan.",
    };
  }

  return {
    title: `No ${tab.toLowerCase()} skills`,
    description: "Switch tabs or rescan projects.",
  };
}

function normalizeSkillName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
