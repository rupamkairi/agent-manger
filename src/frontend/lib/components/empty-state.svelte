<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    icon,
    title,
    description,
    children,
  }: {
    icon?: Snippet;
    title: string;
    description: string;
    children?: Snippet;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
  {#if icon}
    <div class="mb-3 text-muted-foreground">
      {@render icon()}
    </div>
  {/if}
  <h3 class="text-sm font-medium">{title}</h3>
  <p class="mt-1 text-xs text-muted-foreground">{description}</p>
  {#if children}
    <div class="mt-3">
      {@render children()}
    </div>
  {/if}
</div>
