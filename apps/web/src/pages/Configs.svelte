<script lang="ts">
	import FileResourcePage from "$lib/components/resources/FileResourcePage.svelte";
	import { listConfigs } from "$lib/api/endpoints";
	import type { EditorLanguage } from "$lib/editor/languages";

	function configLanguage(format: "json" | "toml" | "markdown" | "other"): EditorLanguage {
		if (format === "json") return "json";
		if (format === "toml") return "toml";
		if (format === "markdown") return "markdown";
		return "plain";
	}
</script>

<FileResourcePage
	title="Configs"
	description="Config files across agents."
	fetcher={listConfigs}
	fileName={(item) => item.config.fileName}
	isEmpty={(item) => item.config.isEmpty}
	format={(item) => item.config.format}
	kind="config"
	editorLanguage={(item) => configLanguage(item.config.format)}
/>
