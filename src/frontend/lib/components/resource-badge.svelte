<script lang="ts">
  import type { ResourceScope, Severity, ValidationStatus } from "../../../shared/types/resource";

  const toneClass: Record<string, string> = {
    global: "border-info/40 bg-info/10 text-info",
    project: "border-warning/40 bg-warning/10 text-warning",
    shared: "border-secondary/40 bg-secondary/10 text-secondary",
    valid: "border-success/40 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    invalid: "border-danger/40 bg-danger/10 text-danger",
    critical: "border-danger/40 bg-danger/10 text-danger",
    primary: "border-primary/40 bg-primary/10 text-primary",
    neutral: "border-outline-variant bg-surface-highest text-on-surface-variant",
    unknown: "border-outline-variant bg-surface-high text-on-surface-variant",
  };

  let {
    label,
    tone = "neutral",
  }: {
    label: string;
    tone?: ResourceScope | Severity | ValidationStatus | "primary" | "neutral";
  } = $props();
</script>

<span class={`inline-flex h-5 items-center rounded border px-1.5 text-path uppercase ${toneClass[tone] ?? toneClass.neutral}`}>
  {label}
</span>
