<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="mb-6 flex items-center justify-between">
  <div>
    <h2 class="text-2xl font-bold">{title}</h2>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>
  {#if children}
    <div>
      {@render children()}
    </div>
  {/if}
</div>
