<script lang="ts">
	import CodeEditor from "$lib/editor/CodeEditor.svelte";
	import type { EditorLanguage } from "$lib/editor/languages";
	import { Button } from "$lib/components/ui/button";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import ConflictReloadAlert from "./ConflictReloadAlert.svelte";
	import { putInstruction, putMemory, putConfig, type FilePutBody } from "$lib/api/endpoints";
	import { getResourceContent } from "$lib/api/endpoints";
	import { ApiError } from "$lib/api/client";
	import { toast } from "svelte-sonner";
	import type { SyntaxErrorDetail } from "@weave/shared";

	let {
		resourceId,
		kind,
		language,
		initialContent,
		initialHash,
		onSaved,
		onCancel,
	}: {
		resourceId: string;
		kind: "instruction" | "memory" | "config";
		language: EditorLanguage;
		initialContent: string;
		initialHash: string;
		onSaved: (newHash: string) => void;
		onCancel: () => void;
	} = $props();

	function putter(id: string, body: FilePutBody) {
		if (kind === "instruction") return putInstruction(id, body);
		if (kind === "memory") return putMemory(id, body);
		return putConfig(id, body);
	}

	let content = $state(initialContent);
	let savedContent = $state(initialContent);
	let hash = $state(initialHash);
	let saving = $state(false);
	let reloading = $state(false);
	let overwriting = $state(false);
	let conflictCurrentHash = $state<string | undefined>(undefined);
	let showConflict = $state(false);
	let validationMessage = $state<string | null>(null);
	let diagnostics = $state<{ line: number; col: number; message: string }[]>([]);

	const dirty = $derived(content !== savedContent);

	export function isDirty(): boolean {
		return dirty;
	}

	function clearErrors() {
		showConflict = false;
		conflictCurrentHash = undefined;
		validationMessage = null;
		diagnostics = [];
	}

	async function performSave(ifHash: string) {
		saving = true;
		try {
			const result = await putter(resourceId, { content, ifHash });
			hash = result.hash;
			savedContent = content;
			clearErrors();
			toast.success("Saved");
			onSaved(result.hash);
		} catch (err) {
			if (err instanceof ApiError && err.code === "conflict") {
				const details = err.details as { currentHash?: string } | undefined;
				conflictCurrentHash = details?.currentHash;
				showConflict = true;
			} else if (err instanceof ApiError && err.code === "validation_failed" && kind === "config") {
				const detail = err.details as SyntaxErrorDetail | undefined;
				if (detail) {
					diagnostics = [
						{ line: detail.line ?? 1, col: (detail.column ?? 1) - 1, message: detail.message },
					];
					validationMessage = `Fix syntax error at line ${detail.line ?? "unknown"}.`;
				} else {
					toast.error(err.message);
				}
			} else {
				toast.error(err instanceof ApiError ? err.message : "Failed to save file");
			}
		} finally {
			saving = false;
		}
	}

	async function handleSave() {
		clearErrors();
		await performSave(hash);
	}

	async function handleReload() {
		reloading = true;
		try {
			const result = await getResourceContent(resourceId);
			content = result.content ?? "";
			savedContent = content;
			if (result.hash) hash = result.hash;
			clearErrors();
			toast.success("File reloaded");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to reload file");
		} finally {
			reloading = false;
		}
	}

	async function handleOverwrite() {
		overwriting = true;
		try {
			let target = conflictCurrentHash;
			if (!target) {
				const result = await getResourceContent(resourceId);
				target = result.hash ?? hash;
			}
			await performSave(target);
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Failed to overwrite file");
		} finally {
			overwriting = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	{#if showConflict}
		<ConflictReloadAlert onReload={handleReload} onOverwrite={handleOverwrite} {reloading} {overwriting} />
	{/if}
	{#if validationMessage}
		<Alert variant="destructive">
			<AlertTitle>Syntax error</AlertTitle>
			<AlertDescription>{validationMessage}</AlertDescription>
		</Alert>
	{/if}

	<CodeEditor bind:value={content} {language} onSave={handleSave} {diagnostics} minHeight="24rem" />

	<div class="flex justify-end gap-2">
		<Button variant="outline" onclick={onCancel} disabled={saving}>Cancel</Button>
		<Button onclick={handleSave} disabled={saving || !dirty}>
			{saving ? "Saving…" : "Save"}
		</Button>
	</div>
</div>
