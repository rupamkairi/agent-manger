<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import * as Select from "$lib/components/ui/select";
	import type { SkillSource } from "@weave/shared";

	type SourceKind = SkillSource["kind"];

	const SOURCE_OPTIONS: { value: SourceKind; label: string }[] = [
		{ value: "localFolder", label: "Local folder" },
		{ value: "zip", label: "Zip file" },
		{ value: "githubRepo", label: "GitHub repository" },
		{ value: "githubSubfolder", label: "GitHub subfolder" },
	];

	let {
		kind = $bindable("localFolder"),
		localPath = $bindable(""),
		zipPath = $bindable(""),
		githubUrl = $bindable(""),
		githubRef = $bindable(""),
		githubSubpath = $bindable(""),
	}: {
		kind: SourceKind;
		localPath: string;
		zipPath: string;
		githubUrl: string;
		githubRef: string;
		githubSubpath: string;
	} = $props();
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-2">
		<Label>Source type</Label>
		<Select.Root
			type="single"
			value={kind}
			onValueChange={(value) => {
				if (value) kind = value as SourceKind;
			}}
		>
			<Select.Trigger class="w-full">
				{SOURCE_OPTIONS.find((o) => o.value === kind)?.label ?? "Select source"}
			</Select.Trigger>
			<Select.Content>
				{#each SOURCE_OPTIONS as option (option.value)}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if kind === "localFolder"}
		<div class="flex flex-col gap-2">
			<Label for="skill-import-local-path">Folder path</Label>
			<Input id="skill-import-local-path" placeholder="/path/to/skill" bind:value={localPath} />
		</div>
	{:else if kind === "zip"}
		<div class="flex flex-col gap-2">
			<Label for="skill-import-zip-path">Zip file path</Label>
			<Input id="skill-import-zip-path" placeholder="/path/to/skill.zip" bind:value={zipPath} />
		</div>
	{:else if kind === "githubRepo"}
		<div class="flex flex-col gap-2">
			<Label for="skill-import-github-url">Repository URL</Label>
			<Input
				id="skill-import-github-url"
				placeholder="https://github.com/owner/repo"
				bind:value={githubUrl}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="skill-import-github-ref">Ref (optional)</Label>
			<Input id="skill-import-github-ref" placeholder="main" bind:value={githubRef} />
		</div>
	{:else if kind === "githubSubfolder"}
		<div class="flex flex-col gap-2">
			<Label for="skill-import-github-subfolder-url">Repository URL</Label>
			<Input
				id="skill-import-github-subfolder-url"
				placeholder="https://github.com/owner/repo"
				bind:value={githubUrl}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="skill-import-github-subpath">Subfolder path</Label>
			<Input
				id="skill-import-github-subpath"
				placeholder="skills/my-skill"
				bind:value={githubSubpath}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="skill-import-github-subfolder-ref">Ref (optional)</Label>
			<Input id="skill-import-github-subfolder-ref" placeholder="main" bind:value={githubRef} />
		</div>
	{/if}
</div>
