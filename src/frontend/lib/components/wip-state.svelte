<script lang="ts">
  let {
    title = "Work In Progress",
    description = "This area is intentionally parked for later.",
    compact = false,
  }: {
    title?: string;
    description?: string;
    compact?: boolean;
  } = $props();
</script>

<div class={`rounded border border-dashed border-outline-variant bg-surface-high/40 text-center ${compact ? "p-4" : "p-10"}`}>
  <div class={`font-semibold text-warning ${compact ? "text-sm" : "text-base"}`}>🚧 {title}</div>
  <p class={`mx-auto mt-1 max-w-md text-on-surface-variant ${compact ? "text-xs" : "text-sm"}`}>{description}</p>
</div>
