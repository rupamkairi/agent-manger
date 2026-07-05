<script lang="ts">
  import { FolderOpen, Plus, RefreshCw, X } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import WipState from "$lib/components/wip-state.svelte";
  import { desktopApi } from "$lib/services/desktop-api";
  import { addProject, projects, refreshProjects, setSelectedProject, uiState } from "$lib/stores/app-state.svelte";

  let activeTab = $state("Overview");
  let addDialogOpen = $state(false);
  let projectPath = $state("");
  let addError = $state("");
  let addPending = $state(false);

  function openAddDialog() {
    addDialogOpen = true;
    addError = "";
  }

  async function pickFolder() {
    const pickedPath = await desktopApi.pickProjectFolder();

    if (pickedPath) {
      projectPath = pickedPath;
      addError = "";
    }
  }

  async function submitProject() {
    if (!projectPath.trim()) {
      addError = "Enter a folder path.";
      return;
    }

    addPending = true;
    addError = "";

    try {
      const added = await addProject(projectPath);

      if (!added) {
        addError = "Could not add project.";
        return;
      }

      addDialogOpen = false;
      projectPath = "";
      activeTab = "Overview";
    } finally {
      addPending = false;
    }
  }
</script>

<PageHeader title="Managed Projects" description="Open local folders, persist them, and rescan them without losing state on restart.">
  <CommandBar actions={[
    { label: "Refresh", icon: RefreshCw, onClick: () => refreshProjects() },
    { label: "Add Project", icon: Plus, variant: "primary", onClick: openAddDialog },
  ]} />
</PageHeader>

<div class="space-y-5">
  <ResourceTabs tabs={["Overview", "Resources 🚧", "Settings 🚧"]} bind:active={activeTab} onChange={(tab) => activeTab = tab} />

  {#if activeTab === "Overview"}
    {#if projects.length === 0}
      <EmptyState title="No managed projects yet" description="Add any folder. It will stay persisted across app restarts.">
        {#snippet children()}
          <button class="inline-flex h-8 items-center gap-1.5 rounded border border-primary bg-primary px-2.5 text-xs font-medium text-primary-foreground" onclick={openAddDialog}>
            <Plus class="size-3.5" />
            Add Project
          </button>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="overflow-hidden border border-outline-variant">
        <table class="w-full border-collapse text-left">
          <thead class="bg-surface-low text-label text-on-surface-variant">
            <tr>
              <th class="border-b border-outline-variant px-3 py-2.5 font-medium">Project Name</th>
              <th class="border-b border-outline-variant px-3 py-2.5 font-medium">Last Scanned</th>
              <th class="border-b border-outline-variant px-3 py-2.5 font-medium">Resource Summary</th>
              <th class="border-b border-outline-variant px-3 py-2.5 font-medium">Select</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            {#each projects as project}
              <tr
                class={`cursor-pointer bg-background text-xs transition-colors ${uiState.selectedProjectId === project.id ? "bg-accent/70" : "hover:bg-surface-high"}`}
                onclick={() => setSelectedProject(project.id)}
              >
                <td class="px-3 py-2.5 align-middle text-on-surface">
                  <span class="font-semibold">{project.name}</span>
                </td>
                <td class="px-3 py-2.5 align-middle text-on-surface">{project.lastScanned}</td>
                <td class="px-3 py-2.5 align-middle text-on-surface">
                  <span class="mr-1.5 rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-path text-success">{project.agentCount} agents</span>
                  <span class="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-path text-warning">{project.skillCount} skills</span>
                </td>
                <td class="px-3 py-2.5 align-middle text-on-surface">
                  <button
                    class="inline-flex h-7 items-center rounded border border-outline-variant px-2.5 text-[11px] font-medium text-on-surface-variant hover:text-on-surface disabled:cursor-default disabled:opacity-50"
                    onclick={(event) => {
                      event.stopPropagation();
                      setSelectedProject(project.id);
                    }}
                    disabled={uiState.selectedProjectId === project.id}
                  >
                    {uiState.selectedProjectId === project.id ? "Selected" : "Select"}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === "Resources 🚧"}
    <WipState title="Project Resources WIP" description="Resource inventory per project is parked for a later pass." />
  {:else}
    <WipState title="Project Settings WIP" description="Per-project settings stay clickable, but disabled, in this pass." />
  {/if}
</div>

{#if addDialogOpen}
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
    <div class="w-full max-w-md border border-outline-variant bg-background p-4 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-on-surface">Add Project</h2>
          <p class="mt-1 text-xs text-on-surface-variant">Pick a folder if the desktop picker is available, or paste a path manually.</p>
        </div>
        <button class="inline-flex size-8 items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:text-on-surface" aria-label="Close add project dialog" onclick={() => addDialogOpen = false}>
          <X class="size-4" />
        </button>
      </div>

      <div class="mt-4 space-y-3">
        <button class="inline-flex h-8 items-center gap-1.5 rounded border border-outline-variant bg-surface-high px-2.5 text-xs font-medium text-on-surface-variant hover:text-on-surface" onclick={pickFolder}>
          <FolderOpen class="size-3.5" />
          Pick Folder
        </button>

        <div>
          <label class="mb-1 block text-xs font-medium text-on-surface-variant" for="project-path">Folder Path</label>
          <input
            id="project-path"
            class="h-8 w-full rounded border border-outline-variant bg-transparent px-2.5 text-sm outline-none"
            bind:value={projectPath}
            placeholder="/Users/name/project"
          />
        </div>

        {#if addError}
          <p class="text-xs text-danger">{addError}</p>
        {/if}
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="inline-flex h-8 items-center rounded border border-outline-variant px-2.5 text-xs font-medium text-on-surface-variant" onclick={() => addDialogOpen = false}>
          Cancel
        </button>
        <button class="inline-flex h-8 items-center rounded border border-primary bg-primary px-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50" onclick={submitProject} disabled={addPending}>
          Add Project
        </button>
      </div>
    </div>
  </div>
{/if}
