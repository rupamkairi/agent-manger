<script lang="ts">
  import { Eye, RotateCcw, Save, Trash2 } from "@lucide/svelte";

  let {
    content,
  }: {
    content: string;
  } = $props();

  const lines = content.split("\n");
</script>

<section class="flex min-w-0 flex-1 flex-col bg-terminal">
  <div class="flex h-10 items-center justify-between border-b border-outline-variant bg-background px-3">
    <div class="flex h-full items-end gap-4">
      <button class="h-9 border-b-2 border-primary px-0.5 text-xs font-medium text-primary">Edit</button>
      <button class="flex h-9 items-center gap-1.5 border-b-2 border-transparent px-0.5 text-xs text-on-surface-variant">
        <Eye class="size-3.5" />
        Preview
      </button>
    </div>
    <div class="flex gap-1.5">
      <button class="inline-flex h-7 items-center gap-1.5 rounded bg-primary px-2 text-xs font-medium text-primary-foreground">
        <Save class="size-3.5" />
        Save
      </button>
      <button class="inline-flex h-7 items-center gap-1.5 rounded border border-outline-variant px-2 text-xs text-on-surface-variant">
        <RotateCcw class="size-3.5" />
        Revert
      </button>
      <button class="inline-flex h-7 items-center gap-1.5 rounded border border-danger px-2 text-xs text-danger">
        <Trash2 class="size-3.5" />
        Delete
      </button>
    </div>
  </div>
  <pre class="m-0 flex-1 overflow-auto p-4 text-code text-on-surface leading-5"><code>{#each lines as line, index}<span class="mr-4 inline-block w-6 select-none text-right text-outline-variant">{index + 1}</span>{line}
{/each}</code></pre>
</section>
