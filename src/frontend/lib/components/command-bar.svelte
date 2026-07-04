<script lang="ts">
  import type { Component } from "svelte";

  type Action = {
    label: string;
    icon?: Component;
    variant?: "primary" | "secondary" | "danger";
  };

  let {
    actions = [],
  }: {
    actions?: Action[];
  } = $props();
</script>

<div class="flex items-center gap-2">
  {#each actions as action}
    <button
      class={`inline-flex h-9 items-center gap-2 rounded border px-3 text-sm font-semibold transition-colors ${
        action.variant === "primary"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : action.variant === "danger"
            ? "border-danger text-danger hover:bg-danger/10"
            : "border-outline-variant bg-surface-high text-on-surface hover:bg-surface-highest"
      }`}
    >
      {#if action.icon}
        <action.icon class="size-4" />
      {/if}
      {action.label}
    </button>
  {/each}
</div>
