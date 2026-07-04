<script lang="ts">
  import type { ValidationStatus, Severity } from "../../../shared/types/resource";

  let {
    status = "unknown",
  }: {
    status?: ValidationStatus | Severity | "installed" | "missing" | "online";
  } = $props();

  const colorByStatus: Record<string, string> = {
    valid: "bg-success",
    installed: "bg-success",
    online: "bg-success",
    info: "bg-info",
    warning: "bg-warning",
    unknown: "bg-outline",
    invalid: "bg-danger",
    critical: "bg-danger",
    missing: "bg-danger",
  };
</script>

<span class={`inline-block size-2 rounded-full ${colorByStatus[status] ?? "bg-outline"}`}></span>
