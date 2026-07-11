import type { Scope } from "@weave/shared";
import { resolveGlobalPath, resolveProjectPath, type AgentAdapter } from "../adapters/types";
import { globMatch, type GlobMatchOptions } from "./walk";
import { buildFileRecord, type FileRecord } from "./file-record";

export async function scanMemoryFiles(
  adapter: AgentAdapter,
  scope: Scope,
  scanRoot: string,
  projectRoot: string | null,
  options: GlobMatchOptions,
): Promise<FileRecord[]> {
  const rawPatterns = scope === "global" ? adapter.memoryPatterns.global : adapter.memoryPatterns.project;

  const absolutePatterns = rawPatterns.map((p) =>
    scope === "global" ? resolveGlobalPath(p) : resolveProjectPath(projectRoot ?? scanRoot, p),
  );

  const matches = await globMatch(scanRoot, absolutePatterns, options);
  const records: FileRecord[] = [];
  for (const match of matches) {
    const record = await buildFileRecord(match);
    if (record) records.push(record);
  }
  return records;
}
