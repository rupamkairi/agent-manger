import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import type { Extension } from "@codemirror/state";

export type EditorLanguage = "markdown" | "json" | "yaml" | "toml" | "plain";

export function languageExtension(language: EditorLanguage): Extension {
	switch (language) {
		case "markdown":
			return markdown();
		case "json":
			return json();
		case "yaml":
			return yaml();
		case "toml":
			return StreamLanguage.define(toml);
		case "plain":
			return [];
	}
}
