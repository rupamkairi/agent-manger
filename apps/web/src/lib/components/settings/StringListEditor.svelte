<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import XIcon from "@lucide/svelte/icons/x";

	let {
		value = $bindable<string[]>([]),
		placeholder = "",
		addLabel = "Add",
	}: {
		value?: string[];
		placeholder?: string;
		addLabel?: string;
	} = $props();

	function updateAt(index: number, next: string) {
		value = value.map((item, i) => (i === index ? next : item));
	}

	function removeAt(index: number) {
		value = value.filter((_, i) => i !== index);
	}

	function add() {
		value = [...value, ""];
	}
</script>

<div class="flex flex-col gap-2">
	{#each value as item, index (index)}
		<div class="flex items-center gap-2">
			<Input
				{placeholder}
				value={item}
				oninput={(event: Event) => updateAt(index, (event.currentTarget as HTMLInputElement).value)}
			/>
			<Button variant="ghost" size="icon-sm" onclick={() => removeAt(index)}>
				<XIcon class="size-4" />
				<span class="sr-only">Remove</span>
			</Button>
		</div>
	{/each}
	<Button variant="outline" size="sm" class="self-start" onclick={add}>
		<PlusIcon class="size-4" />
		{addLabel}
	</Button>
</div>
