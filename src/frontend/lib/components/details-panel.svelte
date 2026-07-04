<script lang="ts">
  import { X } from "@lucide/svelte";
  import {
    getCurrentPage,
    getSelectedInstruction,
    getSelectedAgent,
    getSelectedSkill,
    getSelectedProject,
    getScanSummary,
    toggleDetails,
  } from "$lib/stores/app-state.svelte";
  import ResourceBadge from "./resource-badge.svelte";
  import WipState from "./wip-state.svelte";

  function title() {
    const page = getCurrentPage();
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

  {#if getCurrentPage() === "projects"}
    {#if getSelectedProject()}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={getSelectedProject()?.environment ?? "local"} tone="primary" />
        <h3 class="mt-2 text-xl font-semibold">{getSelectedProject()?.name}</h3>
        <p class="mt-1 break-all text-xs text-on-surface-variant">{getSelectedProject()?.path}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 border-b border-outline-variant p-4">
        <div class="border border-outline-variant p-2.5">
          <div class="text-xs text-on-surface-variant">Active Agents</div>
          <div class="text-xl font-semibold text-success">{String(getSelectedProject()?.agentCount ?? 0).padStart(2, "0")}</div>
        </div>
        <div class="border border-outline-variant p-2.5">
          <div class="text-xs text-on-surface-variant">Skills</div>
          <div class="text-xl font-semibold text-warning">{getSelectedProject()?.skillCount ?? 0}</div>
        </div>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Last Scanned</div>
          <div>{getSelectedProject()?.lastScanned}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Instruction Files</div>
          <div>{getSelectedProject()?.instructionCount ?? 0}</div>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No project selected" description="Add a folder or select a managed project to see its details here." />
      </div>
    {/if}
  {:else if getCurrentPage() === "agents"}
    {#if getSelectedAgent()}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={getSelectedAgent()?.status ?? "unknown"} tone={getSelectedAgent()?.commandStatus ?? "unknown"} />
        <h3 class="mt-2 text-xl font-semibold">{getSelectedAgent()?.name}</h3>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Binary Path</div>
          <div class="break-all">{getSelectedAgent()?.binaryPath}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Version</div>
          <div>{getSelectedAgent()?.version}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Command Status</div>
          <div>{getSelectedAgent()?.commandStatus}</div>
        </div>
        <div>
          <div class="mb-1 text-on-surface-variant">Detected Resource Paths</div>
          {#if (getSelectedAgent()?.resourcePaths.length ?? 0) > 0}
            <div class="space-y-1">
              {#each getSelectedAgent()?.resourcePaths ?? [] as path}
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
  {:else if getCurrentPage() === "skills"}
    {#if getSelectedSkill()}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={getSelectedSkill()?.scope ?? "project"} tone={getSelectedSkill()?.scope ?? "project"} />
        <h3 class="mt-2 text-xl font-semibold">{getSelectedSkill()?.name}</h3>
        <p class="mt-1 text-xs text-on-surface-variant">{getSelectedSkill()?.description}</p>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Agent Target</div>
          <div class="uppercase">{getSelectedSkill()?.agentTarget}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Location</div>
          <div class="break-all">{getSelectedSkill()?.location}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Status</div>
          <div class="uppercase">{getSelectedSkill()?.status}</div>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No skill selected" description="Pick a skill row to inspect its manifest and validation state." />
      </div>
    {/if}
  {:else if getCurrentPage() === "instructions"}
    {#if getSelectedInstruction()}
      <div class="border-b border-outline-variant bg-surface-high p-4">
        <ResourceBadge label={getSelectedInstruction()?.scope ?? "project"} tone={getSelectedInstruction()?.scope ?? "project"} />
        <h3 class="mt-2 text-xl font-semibold">{getSelectedInstruction()?.name}</h3>
        <p class="mt-1 break-all text-xs text-on-surface-variant">{getSelectedInstruction()?.path}</p>
      </div>
      <div class="space-y-3 p-4 text-xs">
        <div>
          <div class="text-on-surface-variant">Agent Target</div>
          <div class="uppercase">{getSelectedInstruction()?.agentTarget}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Last Modified</div>
          <div>{getSelectedInstruction()?.lastModified}</div>
        </div>
        <div>
          <div class="text-on-surface-variant">Status</div>
          <div class="uppercase">{getSelectedInstruction()?.status}</div>
        </div>
        <div>
          <div class="mb-1 text-on-surface-variant">Preview</div>
          <pre class="max-h-48 overflow-auto whitespace-pre-wrap border border-outline-variant bg-background p-2 text-[11px] text-on-surface">{getSelectedInstruction()?.content?.slice(0, 480) ?? ""}</pre>
        </div>
      </div>
    {:else}
      <div class="p-4">
        <WipState compact title="No instruction selected" description="Pick an instruction row to inspect its file, scope, and content." />
      </div>
    {/if}
  {:else if ["dashboard", "memory", "settings"].includes(getCurrentPage())}
    <div class="p-4">
      <WipState compact title="Panel WIP" description="This companion panel is intentionally disabled for the parked section." />
    </div>
  {:else}
    <div class="space-y-3 p-4 text-xs">
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Selected Project</div>
        <div class="mt-1">{getSelectedProject()?.name ?? "none"}</div>
      </div>
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Detected Agents</div>
        <div class="mt-1">{getScanSummary().detectedAgentsCount}</div>
      </div>
      <div class="border border-outline-variant bg-surface-high p-3">
        <div class="text-on-surface-variant">Warnings</div>
        <div class="mt-1">{getScanSummary().warningCount}</div>
      </div>
    </div>
  {/if}
</aside>
