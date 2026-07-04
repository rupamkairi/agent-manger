<script lang="ts">
  let {
    tabs,
    active = $bindable(tabs[0] ?? ""),
    onChange,
  }: {
    tabs: string[];
    active?: string;
    onChange?: (tab: string) => void;
  } = $props();
</script>

<div class="flex h-9 items-end gap-4 border-b border-outline-variant">
  {#each tabs as tab}
    <button
      onclick={() => {
        active = tab;
        onChange?.(tab);
      }}
      class={`h-9 border-b-2 px-0.5 text-xs font-medium transition-colors ${
        active === tab
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {tab}
    </button>
  {/each}
</div>
