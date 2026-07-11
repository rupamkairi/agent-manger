import { extname } from "node:path";
import type { Scope } from "@weave/shared";
import { resolveGlobalPath, resolveProjectPath, type AgentAdapter } from "../adapters/types";
import { buildFileRecord, type FileRecord } from "./file-record";
import { isPathAllowed, type GlobMatchOptions } from "./walk";

export type ConfigFormat = "json" | "toml" | "markdown" | "other";

export interface ConfigFileRecord extends FileRecord {
  format: ConfigFormat;
}

export function configFormatFromFileName(fileName: string): ConfigFormat {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".json") return "json";
  if (ext === ".toml") return "toml";
  if (ext === ".md") return "markdown";
  return "other";
}

export async function scanConfigFiles(
  adapter: AgentAdapter,
  scope: Scope,
  scanRoot: string,
  projectRoot: string | null,
  options: GlobMatchOptions,
): Promise<ConfigFileRecord[]> {
  const rawPaths = scope === "global" ? adapter.globalConfigPaths : adapter.projectConfigPaths;

  const absolutePaths = rawPaths.map((p) =>
    scope === "global" ? resolveGlobalPath(p) : resolveProjectPath(projectRoot ?? "", p),
  );

  const records: ConfigFileRecord[] = [];
  for (const path of absolutePaths) {
    if (!isPathAllowed(scanRoot, path, options)) continue;
    const record = await buildFileRecord(path);
    if (!record) continue;
    records.push({ ...record, format: configFormatFromFileName(record.fileName) });
  }
  return records;
}
