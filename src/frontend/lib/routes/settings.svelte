<script lang="ts">
  import PageHeader from "$lib/components/page-header.svelte";
</script>

<PageHeader title="Settings" description="Configure your application preferences." />

<div class="space-y-6">
  <div class="rounded-lg border p-4">
    <h3 class="font-medium">Appearance</h3>
    <p class="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
  </div>
  <div class="rounded-lg border p-4">
    <h3 class="font-medium">Integrations</h3>
    <p class="text-sm text-muted-foreground">Manage external service connections.</p>
  </div>
  <div class="rounded-lg border p-4">
    <h3 class="font-medium">About</h3>
    <p class="text-sm text-muted-foreground">Version 0.0.1</p>
  </div>
</div>
