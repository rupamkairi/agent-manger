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

<aside class="flex h-full w-56 shrink-0 flex-col border-r border-outline-variant bg-background">
  <div class="flex h-10 items-center justify-between border-b border-outline-variant px-3">
    <span class="text-label text-on-surface-variant">Explorer</span>
    <Folder class="size-3.5 text-on-surface-variant" />
  </div>
  <div class="flex-1 overflow-auto py-2">
    {#each folders as folder}
      <div class="px-3 py-1">
        <div class="flex items-center gap-2 text-label text-on-surface-variant">
          {#if folder.open}
            <FolderOpen class="size-3.5" />
          {:else}
            <Folder class="size-3.5" />
          {/if}
          {folder.name}
        </div>
      </div>
      {#if folder.open}
        {#each folder.files as file}
          <button
            class={`flex w-full items-center gap-2 border-r-2 px-7 py-1 text-left text-xs ${
              selected === file
                ? "border-primary bg-surface-high text-primary"
                : "border-transparent text-on-surface-variant hover:bg-surface-high"
            }`}
          >
            <FileText class="size-3.5" />
            {file}
          </button>
        {/each}
      {/if}
    {/each}
  </div>
</aside>
