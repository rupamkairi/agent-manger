<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { createQuery } from "$lib/state/query.svelte";
  import {
    getProjectCatalogVersion,
    getSelectedProjectId,
    setSelectedProjectId,
  } from "$lib/state/app-state.svelte";
  import { listProjects } from "$lib/api/endpoints";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import FolderIcon from "@lucide/svelte/icons/folder";

  const projectsQuery = createQuery(() => listProjects(), { silent: true });

  const selectedId = $derived(getSelectedProjectId());
  const selectedProject = $derived(
    selectedId
      ? projectsQuery.data?.find((p) => p.id === selectedId)
      : undefined,
  );
  const label = $derived(selectedProject ? selectedProject.name : "Global");

  $effect(() => {
    getProjectCatalogVersion();
    projectsQuery.refresh();
  });

  $effect(() => {
    if (!selectedId || !projectsQuery.data) return;
    if (!projectsQuery.data.some((project) => project.id === selectedId)) {
      setSelectedProjectId(null);
    }
  });
</script>

<Sidebar.Menu class="">
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="default"
            class="data-[state=open]:bg-sidebar-accent"
            {...props}
          >
            {#if selectedProject}
              <FolderIcon class="size-4" />
            {:else}
              <GlobeIcon class="size-4" />
            {/if}
            <span class="truncate font-medium">{label}</span>
            <ChevronsUpDownIcon class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="w-56" align="start">
        <DropdownMenu.Item onclick={() => setSelectedProjectId(null)}>
          <GlobeIcon class="size-4" />
          Global
        </DropdownMenu.Item>
        {#if projectsQuery.data && projectsQuery.data.length > 0}
          <DropdownMenu.Separator />
          {#each projectsQuery.data as project (project.id)}
            <DropdownMenu.Item onclick={() => setSelectedProjectId(project.id)}>
              <FolderIcon class="size-4" />
              {project.name}
            </DropdownMenu.Item>
          {/each}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
