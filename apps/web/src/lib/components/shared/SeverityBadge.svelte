<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { HealthSeverity } from "@weave/shared";

	let { severity }: { severity: HealthSeverity } = $props();

	const variant = $derived(
		severity === "error"
			? "destructive"
			: severity === "warning"
				? "warning"
				: severity === "info"
					? "info"
					: "outline",
	);

	const label = $derived(
		severity === "error"
			? "Error"
			: severity === "warning"
				? "Warning"
				: severity === "info"
					? "Info"
					: "Unknown",
	);
</script>

<Badge variant={variant}>{label}</Badge>
