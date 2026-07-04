<script lang="ts">
  import { FileText, Folder, FolderOpen } from "@lucide/svelte";

  let {
    selected = "system_prompt_v2.md",
  }: {
    selected?: string;
  } = $props();

  const folders = [
    {
      name: "CORE_INSTRUCTIONS",
      open: true,
      files: ["system_prompt_v2.md", "safety_alignment.md"],
    },
    {
      name: "PROTOCOLS",
      open: false,
      files: [],
    },
    {
      name: "ARCHIVE",
      open: false,
      files: [],
    },
  ];
</script>

<aside class="flex h-full w-64 shrink-0 flex-col border-r border-outline-variant bg-background">
  <div class="flex h-12 items-center justify-between border-b border-outline-variant px-4">
    <span class="text-label uppercase tracking-wider text-on-surface-variant">Explorer</span>
    <Folder class="size-4 text-on-surface-variant" />
  </div>
  <div class="flex-1 overflow-auto py-3">
    {#each folders as folder}
      <div class="px-4 py-1.5">
        <div class="flex items-center gap-2 text-label text-on-surface-variant">
          {#if folder.open}
            <FolderOpen class="size-4" />
          {:else}
            <Folder class="size-4" />
          {/if}
          {folder.name}
        </div>
      </div>
      {#if folder.open}
        {#each folder.files as file}
          <button
            class={`flex w-full items-center gap-2 border-r-2 px-8 py-1.5 text-left text-sm ${
              selected === file
                ? "border-primary bg-surface-high text-primary"
                : "border-transparent text-on-surface-variant hover:bg-surface-high"
            }`}
          >
            <FileText class="size-4" />
            {file}
          </button>
        {/each}
      {/if}
    {/each}
  </div>
</aside>
