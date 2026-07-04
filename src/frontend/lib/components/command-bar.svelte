<script lang="ts">
  import type { Component } from "svelte";

  type Action = {
    label: string;
    icon?: Component;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    onClick?: () => void | Promise<void>;
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
        disabled={action.disabled}
        onclick={action.onClick}
        class={`inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-all ${
          action.variant === "primary"
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : action.variant === "danger"
              ? "border-danger text-danger hover:bg-danger/10"
              : "border-outline-variant bg-surface-high text-on-surface-variant hover:bg-surface-highest hover:text-on-surface"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {#if action.icon}
          <action.icon class="size-3.5" />
        {/if}
        {action.label}
      </button>
    {/each}
  </div>
