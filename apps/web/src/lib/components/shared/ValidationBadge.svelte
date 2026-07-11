<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { SkillStatus } from "@weave/shared";

	let { status }: { status: SkillStatus } = $props();

	const variant = $derived(
		status === "valid"
			? "success"
			: status === "warning"
				? "warning"
				: status === "invalid"
					? "destructive"
					: "outline",
	);

	const label = $derived(
		status === "valid"
			? "Valid"
			: status === "warning"
				? "Warning"
				: status === "invalid"
					? "Invalid"
					: "Unknown",
	);
</script>

<Badge variant={variant}>{label}</Badge>
