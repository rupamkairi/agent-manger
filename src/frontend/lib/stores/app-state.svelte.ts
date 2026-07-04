import type {
  Agent,
  InstructionFile,
  MemoryFile,
  PageId,
  PersistedAppState,
  PersistedProject,
  Project,
  ScanSummary,
  Skill,
  TerminalLine,
  Warning,
} from "../../../shared/types/resource";
import { desktopApi } from "$lib/services/desktop-api";

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

export let terminalLines = $state<TerminalLine[]>([
  { id: "1", level: "INFO", time: "local", message: "Agent Manager ready." },
  { id: "2", level: "EXEC", time: "local", message: "Projects and agent detection route through the desktop bridge." },
]);

const scanSummary: ScanSummary = $state({
  status: "idle",
  selectedProjectId: null,
  lastScanTime: "Never",
  resourceCount: 0,
  detectedAgentsCount: 0,
  warningCount: warnings.length,
});

let currentPage = $state<PageId>("projects");
let selectedProjectId = $state<string | null>(null);
let selectedAgentId = $state<string | null>(null);
let selectedSkillId = $state<string | null>(null);
let selectedInstructionId = $state<string | null>(null);
let selectedResourceId = $state("fetch-context");
let detailsOpen = $state(true);
let terminalOpen = $state(true);
let terminalHeight = $state(184);
let initialized = false;

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page: PageId) {
  currentPage = page;
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

export function getSelectedSkill() {
  return skills.find((skill) => skill.id === selectedSkillId) ?? null;
}

export function setSelectedSkill(id: string | null) {
  selectedSkillId = skills.some((skill) => skill.id === id) ? id : skills[0]?.id ?? null;
}

export function getInstructions() {
  return instructions;
}

export function getSelectedInstruction() {
  return instructions.find((instruction) => instruction.id === selectedInstructionId) ?? null;
}

export function setSelectedInstruction(id: string | null) {
  selectedInstructionId = instructions.some((instruction) => instruction.id === id) ? id : instructions[0]?.id ?? null;
}

export function getSelectedProject() {
  return projects.find((project) => project.id === selectedProjectId) ?? null;
}

export function getSelectedProjectId() {
  return selectedProjectId;
}

export function setSelectedProject(id: string | null) {
  selectedProjectId = projects.some((project) => project.id === id) ? id : projects[0]?.id ?? null;
  scanSummary.selectedProjectId = selectedProjectId;
  void persistAppState();
}

export function getAgents() {
  return agents;
}

export function getSelectedAgent() {
  return agents.find((agent) => agent.id === selectedAgentId) ?? null;
}

export function setSelectedAgent(id: string | null) {
  selectedAgentId = agents.some((agent) => agent.id === id) ? id : agents[0]?.id ?? null;
}

export function getSelectedResourceId() {
  return selectedResourceId;
}

export function setSelectedResource(id: string) {
  selectedResourceId = id;
}

export function getDetailsOpen() {
  return detailsOpen;
}

export function toggleDetails() {
  detailsOpen = !detailsOpen;
}

export function getTerminalOpen() {
  return terminalOpen;
}

export function toggleTerminal() {
  terminalOpen = !terminalOpen;
}

export function getTerminalHeight() {
  return terminalHeight;
}

export function setTerminalHeight(height: number) {
  terminalHeight = Math.min(320, Math.max(120, height));
}

export function appendTerminalLines(nextLines: TerminalLine[]) {
  terminalLines.push(...nextLines);
}

export function clearTerminalLines() {
  terminalLines.splice(0, terminalLines.length);
}

export async function initializeAppState() {
  if (initialized) {
    return;
  }

  initialized = true;

  const state = await desktopApi.loadAppState();

  replaceProjects((state?.projects ?? []).map(fromPersistedProject));
  setSelectedProject(resolveSelectedProjectId(state));
  await Promise.all([refreshProjects(), refreshAgentDetection()]);
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

  scanSummary.status = "scanning";

  const snapshot = await desktopApi.scanProject(normalizedPath);
  const project = snapshot.projects[0] ?? createFallbackProject(normalizedPath);

  projects.push(project);
  setSelectedProject(project.id);
  replaceSkills([...skills, ...snapshot.skills]);
  replaceInstructions([...instructions, ...snapshot.instructions]);
  replaceWarnings([...warnings, ...snapshot.warnings]);
  appendTerminalLines(snapshot.logs);
  syncProjectSummary();
  scanSummary.status = "complete";
  await persistAppState();

  return true;
}

export async function refreshProjects() {
  if (projects.length === 0) {
    selectedProjectId = null;
    scanSummary.status = "idle";
    scanSummary.lastScanTime = "Never";
    scanSummary.resourceCount = 0;
    scanSummary.selectedProjectId = null;
    replaceSkills([]);
    replaceInstructions([]);
    replaceWarnings([...baseWarnings]);
    syncProjectSummary();
    return;
  }

  scanSummary.status = "scanning";

  const snapshots = await Promise.all(projects.map((project) => desktopApi.scanProject(project.path)));
  const nextProjects = snapshots.map((snapshot, index) => snapshot.projects[0] ?? projects[index]);

  replaceProjects(nextProjects);
  replaceSkills(snapshots.flatMap((snapshot) => snapshot.skills));
  replaceInstructions(snapshots.flatMap((snapshot) => snapshot.instructions));
  replaceWarnings([...baseWarnings, ...snapshots.flatMap((snapshot) => snapshot.warnings)]);
  appendTerminalLines(snapshots.flatMap((snapshot) => snapshot.logs));
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

  if (!projects.some((project) => project.id === selectedProjectId)) {
    selectedProjectId = projects[0]?.id ?? null;
  }

  scanSummary.selectedProjectId = selectedProjectId;
  syncProjectSummary();
}

function replaceAgents(nextAgents: Agent[]) {
  agents.splice(0, agents.length, ...nextAgents);

  if (!agents.some((agent) => agent.id === selectedAgentId)) {
    selectedAgentId = agents[0]?.id ?? null;
  }

  scanSummary.detectedAgentsCount = agents.filter((agent) => agent.status === "installed").length;
}

function replaceSkills(nextSkills: Skill[]) {
  skills.splice(0, skills.length, ...nextSkills);

  if (!skills.some((skill) => skill.id === selectedSkillId)) {
    selectedSkillId = skills[0]?.id ?? null;
  }
}

function replaceInstructions(nextInstructions: InstructionFile[]) {
  instructions.splice(0, instructions.length, ...nextInstructions);

  if (!instructions.some((instruction) => instruction.id === selectedInstructionId)) {
    selectedInstructionId = instructions[0]?.id ?? null;
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

function resolveSelectedProjectId(state: PersistedAppState | null) {
  if (!state?.selectedProjectId) {
    return projects[0]?.id ?? null;
  }

  return projects.some((project) => project.id === state.selectedProjectId) ? state.selectedProjectId : projects[0]?.id ?? null;
}

function fromPersistedProject(project: PersistedProject): Project {
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

function toPersistedProject(project: Project): PersistedProject {
  return {
    id: project.id,
    name: project.name,
    path: project.path,
    lastScanned: project.lastScanned,
  };
}

async function persistAppState() {
  await desktopApi.saveAppState({
    version: 1,
    selectedProjectId,
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
