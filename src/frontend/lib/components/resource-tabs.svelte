<script lang="ts">
  let {
    tabs,
    active = $bindable(tabs[0] ?? ""),
    onChange,
    disabledTabs = [],
  }: {
    tabs: string[];
    active?: string;
    onChange?: (tab: string) => void;
    disabledTabs?: string[];
  } = $props();
</script>

<div class="flex h-9 items-end gap-4 border-b border-outline-variant">
  {#each tabs as tab}
    <button
      disabled={disabledTabs.includes(tab)}
      onclick={() => {
        if (disabledTabs.includes(tab)) {
          return;
        }
        active = tab;
        onChange?.(tab);
      }}
      class={`h-9 border-b-2 px-0.5 text-xs font-medium transition-colors ${
        active === tab
          ? "border-primary text-primary"
          : disabledTabs.includes(tab)
            ? "border-transparent text-outline"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {tab}
    </button>
  {/each}
</div>
