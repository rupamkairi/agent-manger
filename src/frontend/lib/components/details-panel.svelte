<script lang="ts">
  import { Info, X } from "@lucide/svelte";
  import {
    agents,
    getCurrentPage,
    getSelectedProject,
    instructions,
    projects,
    skills,
    toggleDetails,
    warnings,
  } from "$lib/stores/app-state.svelte";
  import ResourceBadge from "./resource-badge.svelte";
  import StatusDot from "./status-dot.svelte";

  function title() {
    const page = getCurrentPage();
    if (page === "projects") return "Project Details";
    if (page === "instructions") return "Metadata";
    if (page === "skills") return "Skill Metadata";
    return "System Metadata";
  }
</script>

<aside class="flex w-80 shrink-0 flex-col border-l border-outline-variant bg-surface-low">
  <div class="flex h-12 items-center justify-between border-b border-outline-variant px-5">
    <h2 class="text-label uppercase tracking-wider text-on-surface">{title()}</h2>
    <button class="text-on-surface-variant hover:text-on-surface" onclick={toggleDetails} aria-label="Close details">
      {#if getCurrentPage() === "dashboard"}
        <Info class="size-5" />
      {:else}
        <X class="size-5" />
      {/if}
    </button>
  </div>

  {#if getCurrentPage() === "projects"}
    <div class="border-b border-outline-variant bg-surface-high p-5">
      <ResourceBadge label={getSelectedProject().environment} tone="primary" />
      <h3 class="mt-3 text-2xl font-semibold">{getSelectedProject().name}</h3>
    </div>
    <div class="grid grid-cols-2 gap-3 border-b border-outline-variant p-5">
      <div class="border border-outline-variant p-3">
        <div class="text-sm text-on-surface-variant">Active Agents</div>
        <div class="text-2xl font-semibold text-success">{String(getSelectedProject().agentCount).padStart(2, "0")}</div>
      </div>
      <div class="border border-outline-variant p-3">
        <div class="text-sm text-on-surface-variant">Total Skills</div>
        <div class="text-2xl font-semibold text-warning">{getSelectedProject().skillCount}</div>
      </div>
    </div>
    <div class="space-y-3 p-5">
      <h3 class="text-sm font-semibold">Agent Manifest List</h3>
      {#each agents as agent}
        <div class="flex items-center justify-between border border-outline-variant bg-surface-high px-3 py-2">
          <span class="flex items-center gap-2"><StatusDot status={agent.status} />{agent.name}</span>
          <span class="text-path text-on-surface-variant">{agent.version}</span>
        </div>
      {/each}
    </div>
  {:else if getCurrentPage() === "instructions"}
    <div class="space-y-6 p-5">
      <section>
        <h3 class="text-label uppercase tracking-wider text-on-surface-variant">File Information</h3>
        <p class="mt-3 text-sm">Path</p>
        <p class="text-code text-on-surface">{instructions[0].path}</p>
        <p class="mt-4 text-sm">Scope</p>
        <p class="flex items-center gap-2"><StatusDot status="valid" />Global Admin</p>
      </section>
      <section class="border-t border-outline-variant pt-5">
        <h3 class="text-label uppercase tracking-wider text-on-surface-variant">Version Control</h3>
        <div class="mt-3 border border-outline-variant bg-surface-high p-3">
          <div class="flex justify-between"><span>v1.0.4</span><span class="text-primary">8f2a1b</span></div>
          <p class="mt-1 text-xs text-on-surface-variant">Optimized hierarchical decomposition logic.</p>
        </div>
      </section>
    </div>
  {:else if getCurrentPage() === "skills"}
    <div class="space-y-4 p-5">
      {#each skills as skill}
        <div class="border border-outline-variant bg-surface-high p-3">
          <div class="flex items-center justify-between">
            <span class="font-semibold">{skill.name}</span>
            <StatusDot status={skill.status} />
          </div>
          <p class="mt-2 text-sm text-on-surface-variant">{skill.location}</p>
        </div>
      {/each}
    </div>
  {:else}
    <div class="space-y-6 p-5">
      <div class="rounded border border-outline-variant bg-[radial-gradient(#424754_1px,transparent_1px)] [background-size:12px_12px] p-10 text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full border border-primary text-primary">AM</div>
      </div>
      <section>
        <h3 class="font-semibold">Active Topology</h3>
        <p class="text-sm text-on-surface-variant">Decentralized Mesh Architecture (v2)</p>
      </section>
      <section class="space-y-3">
        <div><div class="text-path text-outline">NODE_VERSION</div><div>LTS-20.11.0</div></div>
        <div><div class="text-path text-outline">API_ENDPOINT</div><div class="text-primary">https://core.agent-manager.io/v1</div></div>
        <div><div class="text-path text-outline">SYSTEM_UPTIME</div><div>14d 02h 11m 44s</div></div>
      </section>
      <section class="border-t border-outline-variant pt-5">
        <h3 class="font-semibold">Active Projects</h3>
        <div class="mt-3 space-y-2">
          {#each projects.slice(0, 3) as project}
            <div class="flex items-center justify-between bg-surface-high px-3 py-1.5">
              <span>{project.name}</span>
              <StatusDot status={project.warningCount > 2 ? "warning" : "valid"} />
            </div>
          {/each}
        </div>
      </section>
      <section class="border-t border-outline-variant pt-5">
        <h3 class="font-semibold">Warnings</h3>
        <div class="mt-3 space-y-3">
          {#each warnings as warning}
            <div class="text-sm">
              <div class="flex items-center gap-2 font-semibold"><StatusDot status={warning.severity} />{warning.resource}</div>
              <p class="text-on-surface-variant">{warning.reason}</p>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</aside>
