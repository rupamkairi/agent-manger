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
    <article class="min-h-[160px] bg-background p-5 transition-colors hover:bg-surface-container">
      <div class="flex items-start justify-between gap-3">
        <span class="text-label uppercase tracking-wide text-on-surface-variant">{metric.label}</span>
        {#if metric.icon}
          <metric.icon class="size-5 text-primary" />
        {/if}
      </div>
      <div class="mt-8 flex items-end gap-2">
        <span class="text-[40px] font-semibold leading-none text-on-surface">{metric.value}</span>
        {#if metric.detail}
          <span class="pb-1 text-sm text-on-surface-variant">{metric.detail}</span>
        {/if}
      </div>
      {#if metric.status}
        <div class="mt-3 flex items-center gap-2 text-path uppercase text-success">
          <StatusDot status={metric.status} />
          Status: {metric.status}
        </div>
      {/if}
    </article>
  {/each}
</section>
