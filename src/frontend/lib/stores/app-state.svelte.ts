import type {
  Agent,
  InstructionFile,
  MemoryFile,
  PageId,
  Project,
  ScanSummary,
  Skill,
  Warning,
} from "../../../shared/types/resource";
import { desktopApi } from "$lib/services/desktop-api";
import {
  buildDuplicateSkillWarnings,
  findProjectById,
  filterSkillsForTab,
  normalizeSkillInventory,
  resolveSelectedSkillId,
  restoreProjects,
  toPersistedProject,
} from "./app-state-helpers";

export const projects = $state<Project[]>([]);
export const agents = $state<Agent[]>([]);
export const skills = $state<Skill[]>([]);
export const instructions = $state<InstructionFile[]>([]);
export const memoryFiles = $state<MemoryFile[]>([]);

const baseWarnings: Warning[] = [
  {
    id: "desktop-api",
    severity: "warning",
    resource: "Desktop API",
    reason: "Some sections are still moving from sample data to real scans.",
    suggestedFix: "Use Projects and Agents for the functional flows in this pass.",
    time: "local",
  },
];

export const warnings = $state<Warning[]>([...baseWarnings]);

export const scanSummary: ScanSummary = $state({
  status: "idle",
  selectedProjectId: null,
  lastScanTime: "Never",
  resourceCount: 0,
  detectedAgentsCount: 0,
  warningCount: warnings.length,
});

export const uiState = $state({
  currentPage: "projects" as PageId,
  selectedProjectId: null as string | null,
  selectedAgentId: null as string | null,
  selectedSkillId: null as string | null,
  selectedInstructionId: null as string | null,
  selectedResourceId: "fetch-context",
  detailsOpen: true,
  terminalOpen: false,
});
let initialized = false;

export function getCurrentPage() {
  return uiState.currentPage;
}

export function setCurrentPage(page: PageId) {
  uiState.currentPage = page;
}

export function getScanSummary() {
  return scanSummary;
}

export function getProjects() {
  return projects;
}

export function getSkills() {
  return skills;
}

export function getGlobalSkills() {
  return filterSkillsForTab(skills, "Global", uiState.selectedProjectId);
}

export function getSelectedProjectSkills() {
  return filterSkillsForTab(skills, "Project", uiState.selectedProjectId);
}

export function getSelectedSkill() {
  return skills.find((skill) => skill.id === uiState.selectedSkillId) ?? null;
}

export function setSelectedSkill(id: string | null) {
  if (id === null) {
    uiState.selectedSkillId = null;
    return;
  }

  uiState.selectedSkillId = skills.some((skill) => skill.id === id) ? id : skills[0]?.id ?? null;
}

export function getInstructions() {
  return instructions;
}

export function getSelectedInstruction() {
  return instructions.find((instruction) => instruction.id === uiState.selectedInstructionId) ?? null;
}

export function setSelectedInstruction(id: string | null) {
  uiState.selectedInstructionId = instructions.some((instruction) => instruction.id === id) ? id : instructions[0]?.id ?? null;
}

export function getSelectedProject() {
  return findProjectById(projects, uiState.selectedProjectId);
}

export function getSelectedProjectId() {
  return uiState.selectedProjectId;
}

export function setSelectedProject(id: string | null) {
  uiState.selectedProjectId = projects.some((project) => project.id === id) ? id : projects[0]?.id ?? null;
  scanSummary.selectedProjectId = uiState.selectedProjectId;
  void persistAppState();
}

export function getAgents() {
  return agents;
}

export function getSelectedAgent() {
  return agents.find((agent) => agent.id === uiState.selectedAgentId) ?? null;
}

export function setSelectedAgent(id: string | null) {
  if (id === null) {
    uiState.selectedAgentId = null;
    return;
  }

  uiState.selectedAgentId = agents.some((agent) => agent.id === id) ? id : agents[0]?.id ?? null;
}

export function getSelectedResourceId() {
  return uiState.selectedResourceId;
}

export function setSelectedResource(id: string) {
  uiState.selectedResourceId = id;
}

export function getDetailsOpen() {
  return uiState.detailsOpen;
}

export function toggleDetails() {
  uiState.detailsOpen = !uiState.detailsOpen;
}

export function getTerminalOpen() {
  return uiState.terminalOpen;
}

export function toggleTerminal() {
  uiState.terminalOpen = !uiState.terminalOpen;
}

export async function initializeAppState() {
  if (initialized) {
    return;
  }

  initialized = true;

  const state = await desktopApi.loadAppState();
  const restored = restoreProjects(state);

  replaceProjects(restored.projects);
  setSelectedProject(restored.selectedProjectId);
  scanSummary.status = "idle";
  await refreshAgentDetection();
  await refreshProjects();
}

export async function addProject(path: string) {
  const normalizedPath = path.trim().replace(/\/$/, "");

  if (!normalizedPath) {
    return false;
  }

  const existing = projects.find((project) => project.path === normalizedPath);

  if (existing) {
    setSelectedProject(existing.id);
    return true;
  }

  projects.push(createFallbackProject(normalizedPath));
  setSelectedProject(projects.at(-1)?.id ?? null);
  await refreshProjects();

  return true;
}

export async function refreshProjects() {
  scanSummary.status = "scanning";

  const [globalSnapshot, ...projectSnapshots] = await Promise.all([
    desktopApi.scanGlobalSkills(),
    ...projects.map((project) => desktopApi.scanProject(project.path)),
  ]);
  const nextProjects = projectSnapshots.map((snapshot, index) => snapshot.projects[0] ?? projects[index]);
  const nextSkills = normalizeSkillInventory([
    ...globalSnapshot.skills,
    ...projectSnapshots.flatMap((snapshot) => snapshot.skills),
  ]);
  const nextInstructions = projectSnapshots.flatMap((snapshot) => snapshot.instructions);
  const nextWarnings = [
    ...baseWarnings,
    ...globalSnapshot.warnings,
    ...projectSnapshots.flatMap((snapshot) => snapshot.warnings),
    ...buildDuplicateSkillWarnings(nextSkills),
  ];

  replaceProjects(nextProjects);
  replaceSkills(nextSkills);
  replaceInstructions(nextInstructions);
  replaceWarnings(nextWarnings);
  syncProjectSummary();
  scanSummary.status = "complete";
  await persistAppState();
}

export async function refreshAgentDetection() {
  const detected = await desktopApi.detectAgents();
  replaceAgents(detected);
}

export async function runAgentCommandChecks() {
  const checked = await desktopApi.checkAgentCommands();
  replaceAgents(checked);
}

function replaceProjects(nextProjects: Project[]) {
  projects.splice(0, projects.length, ...nextProjects);

  if (!projects.some((project) => project.id === uiState.selectedProjectId)) {
    uiState.selectedProjectId = projects[0]?.id ?? null;
  }

  scanSummary.selectedProjectId = uiState.selectedProjectId;
  syncProjectSummary();
}

function replaceAgents(nextAgents: Agent[]) {
  agents.splice(0, agents.length, ...nextAgents);

  if (!agents.some((agent) => agent.id === uiState.selectedAgentId)) {
    uiState.selectedAgentId = agents[0]?.id ?? null;
  }

  scanSummary.detectedAgentsCount = agents.filter((agent) => agent.status === "installed").length;
}

function replaceSkills(nextSkills: Skill[]) {
  skills.splice(0, skills.length, ...nextSkills);
  uiState.selectedSkillId = resolveSelectedSkillId(skills, uiState.selectedSkillId);
}

function replaceInstructions(nextInstructions: InstructionFile[]) {
  instructions.splice(0, instructions.length, ...nextInstructions);

  if (!instructions.some((instruction) => instruction.id === uiState.selectedInstructionId)) {
    uiState.selectedInstructionId = instructions[0]?.id ?? null;
  }
}

function replaceWarnings(nextWarnings: Warning[]) {
  warnings.splice(0, warnings.length, ...nextWarnings);
}

function syncProjectSummary() {
  const selectedProject = getSelectedProject();

  scanSummary.selectedProjectId = selectedProject?.id ?? null;
  scanSummary.lastScanTime = selectedProject?.lastScanned ?? "Never";
  scanSummary.resourceCount = skills.length + instructions.length;
  scanSummary.warningCount = warnings.length;
}

async function persistAppState() {
  await desktopApi.saveAppState({
    version: 1,
    selectedProjectId: uiState.selectedProjectId,
    projects: projects.map(toPersistedProject),
  });
}

function createFallbackProject(path: string): Project {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;

  return {
    id: path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(),
    name,
    path,
    environment: "local",
    lastScanned: new Date().toLocaleString("sv-SE").replace("T", " "),
    agentCount: 0,
    skillCount: 0,
    instructionCount: 0,
    warningCount: 0,
  };
}
