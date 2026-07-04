<script lang="ts">
  let {
    tabs,
    active = tabs[0] ?? "",
  }: {
    tabs: string[];
    active?: string;
  } = $props();
</script>

<div class="flex h-10 items-end gap-5 border-b border-outline-variant">
  {#each tabs as tab}
    <button
      class={`h-10 border-b-2 px-1 text-sm font-medium transition-colors ${
        active === tab
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {tab}
    </button>
  {/each}
</div>
