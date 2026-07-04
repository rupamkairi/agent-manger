<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import { Bot } from "@lucide/svelte";
</script>

<PageHeader title="Agents" description="Configure your AI agents and assistants.">
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Add Agent
  </button>
</PageHeader>

<EmptyState
  title="No agents configured"
  description="Add an agent to start building your AI-powered workflows."
>
  <button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
    Add Agent
  </button>
</EmptyState>
