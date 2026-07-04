<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import { FolderOpen } from "@lucide/svelte";
</script>

<PageHeader title="Projects" description="Manage your AI resource projects.">
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    New Project
  </button>
</PageHeader>

<EmptyState
  title="No projects yet"
  description="Create a project to get started with managing your AI resources."
>
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Create Project
  </button>
</EmptyState>
