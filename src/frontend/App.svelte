<script lang="ts">
  import { onMount } from "svelte";
  import AppShell from "./lib/components/app-shell.svelte";
  import { initializeAppState } from "$lib/stores/app-state.svelte";

  onMount(() => {
    void initializeAppState();
  });
</script>

<AppShell />
