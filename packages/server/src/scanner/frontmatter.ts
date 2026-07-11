import { parse } from "yaml";

export interface FrontmatterResult {
  data: Record<string, unknown> | null;
  error: string | null;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ParsedMarkdown extends FrontmatterResult {
  body: string;
}

export function extractFrontmatter(content: string): ParsedMarkdown {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) {
    return { data: null, error: "No frontmatter block found", body: content };
  }
  const [, yamlBlock, body] = match;
  try {
    const parsed = parse(yamlBlock ?? "");
    if (parsed === null || parsed === undefined) {
      return { data: {}, error: null, body: body ?? "" };
    }
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: null, error: "Frontmatter is not a YAML mapping", body: body ?? "" };
    }
    return { data: parsed as Record<string, unknown>, error: null, body: body ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to parse frontmatter";
    return { data: null, error: message, body: body ?? "" };
  }
}
