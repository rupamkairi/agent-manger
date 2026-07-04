<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";

  const sections = [
    ["Appearance", "Dark technical theme active. Additional themes will be added later."],
    ["Resource Scan Paths", "Claude Code, Codex, and OpenCode V1 paths enabled."],
    ["Desktop Integration", "Filesystem, terminal, and open-path operations route through the desktop API boundary."],
  ];
</script>

<PageHeader title="Settings" description="Configure application preferences and desktop resource behavior." />

<div class="grid gap-px border border-outline-variant bg-outline-variant md:grid-cols-3">
  {#each sections as section}
    <section class="min-h-40 bg-background p-5">
      <h2 class="font-semibold text-on-surface">{section[0]}</h2>
      <p class="mt-2 text-sm text-on-surface-variant">{section[1]}</p>
    </section>
  {/each}
</div>
