<script lang="ts">
  import type { Component } from "svelte";
  import StatusDot from "./status-dot.svelte";

  type Metric = {
    label: string;
    value: string;
    detail?: string;
    status?: "valid" | "warning" | "invalid" | "unknown";
    icon?: Component;
  };

  let {
    metrics,
  }: {
    metrics: Metric[];
  } = $props();
</script>

<section class="grid border border-outline-variant bg-outline-variant md:grid-cols-3">
  {#each metrics as metric}
    <article class="min-h-[110px] bg-background p-4 transition-colors hover:bg-surface-container">
      <div class="flex items-start justify-between gap-2">
        <span class="text-label text-on-surface-variant">{metric.label}</span>
        {#if metric.icon}
          <metric.icon class="size-4 text-primary" />
        {/if}
      </div>
      <div class="mt-5 flex items-end gap-2">
        <span class="text-3xl font-bold leading-none text-on-surface">{metric.value}</span>
        {#if metric.detail}
          <span class="pb-0.5 text-xs text-on-surface-variant">{metric.detail}</span>
        {/if}
      </div>
      {#if metric.status}
        <div class="mt-2 flex items-center gap-1.5 text-path text-success">
          <StatusDot status={metric.status} />
          {metric.status}
        </div>
      {/if}
    </article>
  {/each}
</section>
