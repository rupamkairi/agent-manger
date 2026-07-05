<script lang="ts">
  import { X } from "@lucide/svelte";
  import {
    agents,
    instructions,
    projects,
    scanSummary,
    skills,
    toggleDetails,
    uiState,
  } from "$lib/stores/app-state.svelte";
  import { findProjectById } from "$lib/stores/app-state-helpers";
  import ResourceBadge from "./resource-badge.svelte";
  import WipState from "./wip-state.svelte";

  const selectedProject = $derived(findProjectById(projects, uiState.selectedProjectId));
  const selectedAgent = $derived(agents.find((agent) => agent.id === uiState.selectedAgentId) ?? null);
  const selectedSkill = $derived(skills.find((skill) => skill.id === uiState.selectedSkillId) ?? null);
  const selectedInstruction = $derived(instructions.find((instruction) => instruction.id === uiState.selectedInstructionId) ?? null);

  function title() {
    const page = uiState.currentPage;
    if (page === "projects") return "Project Details";
    if (page === "agents") return "Agent Details";
    if (page === "skills") return "Skill Details";
    if (page === "instructions") return "Instruction Details";
    if (page === "health") return "Health Context";
    return "Panel";
  }
</script>

<aside class="flex w-72 shrink-0 flex-col border-l border-outline-variant bg-surface-low">
  <div class="flex h-10 items-center justify-between border-b border-outline-variant px-4">
    <h2 class="text-label text-on-surface">{title()}</h2>
    <button class="text-on-surface-variant hover:text-on-surface" onclick={toggleDetails} aria-label="Close details">
      <X class="size-4" />
    </button>
  </div>

  {#if uiState.currentPage === "projects"}
    {#if selectedProject}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={selectedProject?.environment ?? "local"} tone="primary" />
        <h3 class="mt-2 text-xl font-semibold">{selectedProject?.name}</h3>
        <p class="mt-1 break-all text-xs text-on-surface-variant">{selectedProject?.path}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 border-b border-outline-variant p-4">
        <div class="border border-outline-variant p-2.5">
          <div class="text-xs text-on-surface-variant">Active Agents</div>
          <div class="text-xl font-semibold text-success">{String(selectedProject?.agentCount ?? 0).padStart(2, "0")}</div>
        </div>
        <div class="border border-outline-variant p-2.5">
          <div class="text-xs text-on-surface-variant">Skills</div>
          <div class="text-xl font-semibold text-warning">{selectedProject?.skillCount ?? 0}</div>
        </div>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Last Scanned</div>
          <div>{selectedProject?.lastScanned}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Instruction Files</div>
          <div>{selectedProject?.instructionCount ?? 0}</div>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No project selected" description="Add a folder or select a managed project to see its details here." />
      </div>
    {/if}
  {:else if uiState.currentPage === "agents"}
    {#if selectedAgent}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={selectedAgent?.status ?? "unknown"} tone={selectedAgent?.commandStatus ?? "unknown"} />
        <h3 class="mt-2 text-xl font-semibold">{selectedAgent?.name}</h3>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Binary Path</div>
          <div class="break-all">{selectedAgent?.binaryPath}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Version</div>
          <div>{selectedAgent?.version}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Command Status</div>
          <div>{selectedAgent?.commandStatus}</div>
        </div>
        <div>
          <div class="mb-1 text-on-surface-variant">Detected Resource Paths</div>
          {#if (selectedAgent?.resourcePaths.length ?? 0) > 0}
            <div class="space-y-1">
              {#each selectedAgent?.resourcePaths ?? [] as path}
                <div class="break-all border border-outline-variant bg-background px-2 py-1">{path}</div>
              {/each}
            </div>
          {:else}
            <div class="text-on-surface-variant">No known paths detected.</div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No agent selected" description="Run detection or pick an agent row to inspect binary and resource paths." />
      </div>
    {/if}
  {:else if uiState.currentPage === "skills"}
    {#if selectedSkill}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <div class="flex flex-wrap gap-2">
          <ResourceBadge label={selectedSkill?.scope ?? "project"} tone={selectedSkill?.scope ?? "project"} />
          {#if selectedSkill?.duplicateName}
            <ResourceBadge label="duplicate" tone="warning" />
          {/if}
        </div>
        <h3 class="mt-2 text-xl font-semibold">{selectedSkill?.name}</h3>
        <p class="mt-1 text-xs text-on-surface-variant">{selectedSkill?.description}</p>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Agent Target</div>
          <div class="uppercase">{selectedSkill?.agentTarget}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Location</div>
          <div class="break-all">{selectedSkill?.location}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Duplicate Name</div>
          <div>{selectedSkill?.duplicateName ? "yes" : "no"}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Status</div>
          <div class="uppercase">{selectedSkill?.status}</div>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No skill selected" description="Pick a skill row to inspect its manifest and validation state." />
      </div>
    {/if}
  {:else if uiState.currentPage === "instructions"}
    {#if selectedInstruction}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={selectedInstruction?.scope ?? "project"} tone={selectedInstruction?.scope ?? "project"} />
        <h3 class="mt-2 text-xl font-semibold">{selectedInstruction?.name}</h3>
        <p class="mt-1 break-all text-xs text-on-surface-variant">{selectedInstruction?.path}</p>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Agent Target</div>
          <div class="uppercase">{selectedInstruction?.agentTarget}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Last Modified</div>
          <div>{selectedInstruction?.lastModified}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Status</div>
          <div class="uppercase">{selectedInstruction?.status}</div>
        </div>
        <div>
          <div class="mb-1 text-on-surface-variant">Preview</div>
          <pre class="max-h-48 overflow-auto whitespace-pre-wrap border border-outline-variant bg-background p-2 text-[11px] text-on-surface">{selectedInstruction?.content?.slice(0, 480) ?? ""}</pre>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No instruction selected" description="Pick an instruction row to inspect its file, scope, and content." />
      </div>
    {/if}
  {:else if ["dashboard", "memory", "settings"].includes(uiState.currentPage)}
    <div class="p-4">
      <WipState compact title="Panel WIP" description="This companion panel is intentionally disabled for the parked section." />
    </div>
  {:else}
    <div class="space-y-3 p-4 text-xs">
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Selected Project</div>
        <div class="mt-1">{selectedProject?.name ?? "none"}</div>
      </div>
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Detected Agents</div>
        <div class="mt-1">{scanSummary.detectedAgentsCount}</div>
      </div>
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Warnings</div>
        <div class="mt-1">{scanSummary.warningCount}</div>
      </div>
    </div>
  {/if}
</aside>
