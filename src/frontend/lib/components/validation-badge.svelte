<script lang="ts">
  import type { ValidationStatus } from "../../../shared/types/resource";
  import StatusDot from "./status-dot.svelte";

  let {
    status = "unknown",
    label = status.toUpperCase(),
  }: {
    status?: ValidationStatus;
    label?: string;
  } = $props();
</script>

<span class="inline-flex items-center gap-1.5 whitespace-nowrap text-code uppercase text-on-surface">
  <StatusDot {status} />
  {label}
</span>
