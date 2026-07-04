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
  <div class="flex h-12 items-center justify-between border-b border-outline-variant bg-background px-4">
    <div class="flex h-full items-end gap-5">
      <button class="h-10 border-b-2 border-primary px-1 text-sm font-semibold text-primary">Edit</button>
      <button class="flex h-10 items-center gap-2 border-b-2 border-transparent px-1 text-sm text-on-surface-variant">
        <Eye class="size-4" />
        Preview
      </button>
    </div>
    <div class="flex gap-2">
      <button class="inline-flex h-8 items-center gap-2 rounded bg-primary px-3 text-sm font-semibold text-primary-foreground">
        <Save class="size-4" />
        Save
      </button>
      <button class="inline-flex h-8 items-center gap-2 rounded border border-outline-variant px-3 text-sm text-on-surface">
        <RotateCcw class="size-4" />
        Revert
      </button>
      <button class="inline-flex h-8 items-center gap-2 rounded border border-danger px-3 text-sm text-danger">
        <Trash2 class="size-4" />
        Delete
      </button>
    </div>
  </div>
  <pre class="m-0 flex-1 overflow-auto p-6 text-code text-on-surface"><code>{#each lines as line, index}<span class="mr-6 inline-block w-8 select-none text-right text-outline-variant">{index + 1}</span>{line}
{/each}</code></pre>
</section>
