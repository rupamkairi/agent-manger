<script lang="ts">
  import CodeEditorShell from "$lib/components/code-editor-shell.svelte";
  import FileExplorer from "$lib/components/file-explorer.svelte";
  import { instructions } from "$lib/stores/app-state.svelte";
</script>

<div class="-m-6 flex h-[calc(100%+3rem)] min-h-[720px] overflow-hidden">
  <FileExplorer selected={instructions[0].name} />
  <CodeEditorShell content={instructions[0].content} />
</div>
