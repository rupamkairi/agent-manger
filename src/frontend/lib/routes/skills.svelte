<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import { Sparkles } from "@lucide/svelte";
</script>

<PageHeader title="Skills" description="Manage reusable skills and capabilities.">
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Add Skill
  </button>
</PageHeader>

<EmptyState
  title="No skills yet"
  description="Create skills to extend your agents' capabilities."
>
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Create Skill
  </button>
</EmptyState>
