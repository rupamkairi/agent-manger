<script lang="ts">
	import { onDestroy } from "svelte";
	import { basicSetup } from "codemirror";
	import { EditorView, keymap } from "@codemirror/view";
	import { Compartment, EditorState } from "@codemirror/state";
	import { setDiagnostics, type Diagnostic } from "@codemirror/lint";
	import { mode } from "mode-watcher";
	import { createEditorTheme } from "./theme";
	import { languageExtension, type EditorLanguage } from "./languages";

	interface EditorDiagnostic {
		line: number;
		col: number;
		message: string;
	}

	let {
		value = $bindable(""),
		language = "plain",
		readonly = false,
		onSave,
		diagnostics,
		minHeight = "16rem",
	}: {
		value?: string;
		language?: EditorLanguage;
		readonly?: boolean;
		onSave?: () => void;
		diagnostics?: EditorDiagnostic[];
		minHeight?: string;
	} = $props();

	const languageCompartment = new Compartment();
	const themeCompartment = new Compartment();
	const readonlyCompartment = new Compartment();

	let container: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined;

	function saveKeymap() {
		return keymap.of([
			{
				key: "Mod-s",
				run: () => {
					onSave?.();
					return true;
				},
			},
		]);
	}

	function toDiagnostics(state: EditorState, items: EditorDiagnostic[]): Diagnostic[] {
		const result: Diagnostic[] = [];
		for (const item of items) {
			const line = Math.min(Math.max(item.line, 1), state.doc.lines);
			const docLine = state.doc.line(line);
			const from = Math.min(docLine.from + Math.max(item.col, 0), docLine.to);
			result.push({ from, to: docLine.to, severity: "error", message: item.message });
		}
		return result;
	}

	$effect(() => {
		if (!container) return;
		view = new EditorView({
			parent: container,
			state: EditorState.create({
				doc: value,
				extensions: [
					basicSetup,
					saveKeymap(),
					languageCompartment.of(languageExtension(language)),
					themeCompartment.of(createEditorTheme(mode.current === "dark")),
					readonlyCompartment.of(EditorState.readOnly.of(readonly)),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							value = update.state.doc.toString();
						}
					}),
				],
			}),
		});
		return () => {
			view?.destroy();
			view = undefined;
		};
	});

	$effect(() => {
		const next = value;
		if (view && view.state.doc.toString() !== next) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
		}
	});

	$effect(() => {
		const extension = languageExtension(language);
		view?.dispatch({ effects: languageCompartment.reconfigure(extension) });
	});

	$effect(() => {
		const theme = createEditorTheme(mode.current === "dark");
		view?.dispatch({ effects: themeCompartment.reconfigure(theme) });
	});

	$effect(() => {
		const flag = EditorState.readOnly.of(readonly);
		view?.dispatch({ effects: readonlyCompartment.reconfigure(flag) });
	});

	$effect(() => {
		const items = diagnostics ?? [];
		if (!view) return;
		view.dispatch(setDiagnostics(view.state, toDiagnostics(view.state, items)));
	});

	onDestroy(() => {
		view?.destroy();
		view = undefined;
	});
</script>

<div
	bind:this={container}
	class="overflow-hidden rounded-md border"
	style={`min-height: ${minHeight};`}
></div>

<style>
	div :global(.cm-editor) {
		height: 100%;
	}
</style>
