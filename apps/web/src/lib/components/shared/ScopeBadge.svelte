<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { Scope } from "@harbor/shared";

	let { scope }: { scope: Scope } = $props();
</script>

<Badge variant={scope === "global" ? "outline" : "secondary"}>
	{scope === "global" ? "Global" : "Project"}
</Badge>
