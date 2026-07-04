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

<header class="mb-6 flex items-start justify-between gap-4">
  <div class="min-w-0">
    <h1 class="text-[32px] font-semibold leading-tight text-on-surface">{title}</h1>
    {#if description}
      <p class="mt-1 max-w-3xl text-base text-on-surface-variant">{description}</p>
    {/if}
  </div>
  {#if children}
    <div class="shrink-0">
      {@render children()}
    </div>
  {/if}
</header>
