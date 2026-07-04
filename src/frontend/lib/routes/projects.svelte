<script lang="ts">
  import { FolderOpen, Plus, RefreshCw } from "@lucide/svelte";
  import CommandBar from "$lib/components/command-bar.svelte";
  import DataTable from "$lib/components/data-table.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import PageHeader from "$lib/components/page-header.svelte";
  import ResourceTabs from "$lib/components/resource-tabs.svelte";
  import WipState from "$lib/components/wip-state.svelte";
  import { desktopApi } from "$lib/services/desktop-api";
  import { addProject, getProjects, getSelectedProjectId, refreshProjects, setSelectedProject } from "$lib/stores/app-state.svelte";

  let activeTab = $state("Overview");
  let addDialogOpen = $state(false);
  let projectPath = $state("");
  let addError = $state("");
  let addPending = $state(false);

  function rows() {
    return getProjects().map((project) => ({
      _id: project.id,
      name: `<span class="font-semibold text-on-surface">${project.name}</span>`,
      scanned: project.lastScanned,
      summary:
        `<span class="mr-1.5 rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-path text-success">${project.agentCount} agents</span><span class="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-path text-warning">${project.skillCount} skills</span>`,
    }));
  }

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
    {#if getProjects().length === 0}
      <EmptyState title="No managed projects yet" description="Add any folder. It will stay persisted across app restarts.">
        {#snippet children()}
          <button class="inline-flex h-8 items-center gap-1.5 rounded border border-primary bg-primary px-2.5 text-xs font-medium text-primary-foreground" onclick={openAddDialog}>
            <Plus class="size-3.5" />
            Add Project
          </button>
        {/snippet}
      </EmptyState>
    {:else}
      <DataTable
        columns={[
          { key: "name", label: "Project Name", width: "30%" },
          { key: "scanned", label: "Last Scanned", width: "24%" },
          { key: "summary", label: "Resource Summary" },
        ]}
        rows={rows()}
        selectedRowId={getSelectedProjectId()}
        onRowClick={(rowId) => setSelectedProject(rowId)}
      />
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
        <button class="text-xs text-on-surface-variant hover:text-on-surface" onclick={() => addDialogOpen = false}>Close</button>
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
