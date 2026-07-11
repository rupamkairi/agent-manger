<script lang="ts">
	import FileResourcePage from "$lib/components/resources/FileResourcePage.svelte";
	import { listMemory } from "$lib/api/endpoints";
</script>

<FileResourcePage
	title="Memory"
	description="Memory files across agents."
	fetcher={listMemory}
	fileName={(item) => item.memory.fileName}
	isEmpty={(item) => item.memory.isEmpty}
	kind="memory"
	editorLanguage={() => "markdown"}
	canCreate
/>
