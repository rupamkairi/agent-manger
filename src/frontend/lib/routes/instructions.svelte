<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import { FileText } from "@lucide/svelte";
</script>

<PageHeader title="Instructions" description="Define and manage instruction sets.">
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Add Instruction
  </button>
</PageHeader>

<EmptyState
  title="No instructions yet"
  description="Create instruction sets to guide your agents' behavior."
>
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Create Instruction
  </button>
</EmptyState>
