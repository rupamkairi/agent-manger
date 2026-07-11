<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import type { Scope } from "@weave/shared";

	let { scope }: { scope: Scope } = $props();
</script>

<Badge variant={scope === "global" ? "outline" : "secondary"}>
	{scope === "global" ? "Global" : "Project"}
</Badge>
