<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { DetectionState } from "@weave/shared";

	let { state }: { state: DetectionState } = $props();

	const variant = $derived(
		state === "installed" ? "success" : state === "missing" ? "destructive" : "secondary",
	);

	const label = $derived(
		state === "installed" ? "Installed" : state === "missing" ? "Missing" : "Unknown",
	);
</script>

<Badge variant={variant}>{label}</Badge>
