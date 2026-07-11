import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * Minimal editor theme mapped to the shadcn CSS variables so the editor
 * follows the app tokens in both light and dark mode. The `dark` flag only
 * switches CodeMirror's baseline (caret, selection contrast) — colors come
 * from the CSS variables, which flip with the `.dark` class.
 */
function baseTheme(dark: boolean): Extension {
	return EditorView.theme(
		{
			"&": {
				backgroundColor: "var(--background)",
				color: "var(--foreground)",
				fontSize: "0.875rem",
				borderRadius: "var(--radius)",
			},
			"&.cm-focused": {
				outline: "none",
			},
			".cm-content": {
				caretColor: "var(--foreground)",
				fontFamily:
					"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
			},
			".cm-cursor, .cm-dropCursor": {
				borderLeftColor: "var(--foreground)",
			},
			"&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
				{
					backgroundColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
				},
			".cm-activeLine": {
				backgroundColor: "color-mix(in oklch, var(--muted) 60%, transparent)",
			},
			".cm-gutters": {
				backgroundColor: "var(--background)",
				color: "var(--muted-foreground)",
				borderRight: "1px solid var(--border)",
			},
			".cm-activeLineGutter": {
				backgroundColor: "color-mix(in oklch, var(--muted) 60%, transparent)",
			},
			".cm-lineNumbers .cm-gutterElement": {
				padding: "0 0.5rem 0 0.75rem",
			},
			".cm-panels": {
				backgroundColor: "var(--popover)",
				color: "var(--popover-foreground)",
			},
			".cm-tooltip": {
				backgroundColor: "var(--popover)",
				color: "var(--popover-foreground)",
				border: "1px solid var(--border)",
				borderRadius: "var(--radius)",
			},
			".cm-lintRange-error": {
				textDecoration: "underline wavy var(--destructive)",
			},
			".cm-diagnostic-error": {
				borderLeftColor: "var(--destructive)",
			},
		},
		{ dark },
	);
}

const highlightStyle = HighlightStyle.define([
	{ tag: tags.heading, color: "var(--foreground)", fontWeight: "700" },
	{ tag: [tags.keyword, tags.operatorKeyword], color: "var(--chart-3)" },
	{ tag: [tags.propertyName, tags.attributeName], color: "var(--chart-2)" },
	{ tag: [tags.string, tags.special(tags.string)], color: "var(--chart-1)" },
	{ tag: [tags.number, tags.bool, tags.null], color: "var(--chart-4)" },
	{ tag: tags.comment, color: "var(--muted-foreground)", fontStyle: "italic" },
	{ tag: tags.link, color: "var(--chart-2)", textDecoration: "underline" },
	{ tag: tags.url, color: "var(--chart-2)" },
	{ tag: tags.emphasis, fontStyle: "italic" },
	{ tag: tags.strong, fontWeight: "700" },
	{ tag: tags.monospace, color: "var(--chart-5)" },
	{ tag: [tags.meta, tags.processingInstruction], color: "var(--muted-foreground)" },
	{ tag: tags.invalid, color: "var(--destructive)" },
]);

export function createEditorTheme(dark: boolean): Extension {
	return [baseTheme(dark), syntaxHighlighting(highlightStyle)];
}
