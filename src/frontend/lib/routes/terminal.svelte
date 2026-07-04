<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
  import TerminalDrawer from "$lib/components/terminal-drawer.svelte";
</script>

<PageHeader title="Terminal" description="Integrated desktop console for scan progress and command output." />

<div class="h-[520px] border border-outline-variant">
  <TerminalDrawer />
</div>
