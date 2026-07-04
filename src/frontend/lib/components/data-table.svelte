<script lang="ts">
  export type DataColumn = {
    key: string;
    label: string;
    width?: string;
  };

  let {
    columns,
    rows,
    selectedRowId = null,
    onRowClick,
  }: {
    columns: DataColumn[];
    rows: Array<Record<string, string | undefined>>;
    selectedRowId?: string | null;
    onRowClick?: (rowId: string) => void;
  } = $props();
</script>

<div class="overflow-hidden border border-outline-variant">
  <table class="w-full border-collapse text-left">
    <thead class="bg-surface-low text-label text-on-surface-variant">
      <tr>
        {#each columns as column}
          <th class="border-b border-outline-variant px-3 py-2.5 font-medium" style:width={column.width}>
            {column.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-outline-variant">
      {#each rows as row}
        <tr
          class={`bg-background text-xs transition-colors ${
            row._id && onRowClick ? "cursor-pointer hover:bg-surface-high" : ""
          } ${selectedRowId === row._id ? "bg-accent/70" : ""}`}
          onclick={() => row._id && onRowClick?.(row._id)}
        >
          {#each columns as column}
            <td class="px-3 py-2.5 align-middle text-on-surface">
              {@html row[column.key] ?? ""}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
