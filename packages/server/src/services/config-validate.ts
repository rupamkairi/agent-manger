import { extname } from "node:path";
import type { SyntaxErrorDetail } from "@weave/shared";
import { TomlError, parse as parseToml } from "smol-toml";
import { parse as parseYaml, YAMLParseError } from "yaml";

function jsonErrorPosition(message: string, content: string): { line: number | null; column: number | null } {
  const match = /position (\d+)/.exec(message);
  if (!match || match[1] === undefined) return { line: null, column: null };
  const position = Number(match[1]);
  const before = content.slice(0, position);
  const lines = before.split("\n");
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, column };
}

/**
 * Validates config file content by extension. Returns null when the
 * extension is unknown (no validation performed) or when parsing succeeds.
 */
export function validateConfigSyntax(path: string, content: string): SyntaxErrorDetail | null {
  const ext = extname(path).toLowerCase();

  if (ext === ".json") {
    try {
      JSON.parse(content);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      const { line, column } = jsonErrorPosition(message, content);
      return { format: "json", message, line, column };
    }
  }

  if (ext === ".toml") {
    try {
      parseToml(content);
      return null;
    } catch (error) {
      if (error instanceof TomlError) {
        return { format: "toml", message: error.message, line: error.line, column: error.column };
      }
      const message = error instanceof Error ? error.message : "Invalid TOML";
      return { format: "toml", message, line: null, column: null };
    }
  }

  if (ext === ".yaml" || ext === ".yml") {
    try {
      parseYaml(content);
      return null;
    } catch (error) {
      if (error instanceof YAMLParseError) {
        const pos = error.linePos?.[0];
        return {
          format: "yaml",
          message: error.message,
          line: pos?.line ?? null,
          column: pos?.col ?? null,
        };
      }
      const message = error instanceof Error ? error.message : "Invalid YAML";
      return { format: "yaml", message, line: null, column: null };
    }
  }

  return null;
}
