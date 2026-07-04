<script lang="ts">
  export type DataColumn = {
    key: string;
    label: string;
    width?: string;
  };

  let {
    columns,
    rows,
  }: {
    columns: DataColumn[];
    rows: Array<Record<string, string>>;
  } = $props();
</script>

<div class="overflow-hidden border border-outline-variant">
  <table class="w-full border-collapse text-left">
    <thead class="bg-surface-low text-label uppercase tracking-wider text-on-surface-variant">
      <tr>
        {#each columns as column}
          <th class="border-b border-outline-variant px-4 py-3 font-semibold" style:width={column.width}>
            {column.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-outline-variant">
      {#each rows as row}
        <tr class="h-12 bg-background transition-colors hover:bg-surface-high">
          {#each columns as column}
            <td class="px-4 py-3 align-middle text-sm text-on-surface">
              {@html row[column.key] ?? ""}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
