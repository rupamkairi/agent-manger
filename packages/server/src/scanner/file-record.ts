import { basename } from "node:path";
import { resolveSymlink, safeLstat } from "./walk";

export interface FileRecord {
  originalPath: string;
  resolvedPath: string;
  isSymlink: boolean;
  symlinkBroken: boolean;
  sizeBytes: number | null;
  mtime: string | null;
  fileName: string;
  isEmpty: boolean;
}

export async function buildFileRecord(originalPath: string): Promise<FileRecord | null> {
  const { resolved, isSymlink, broken } = await resolveSymlink(originalPath);
  const fileName = basename(originalPath);

  if (broken) {
    return {
      originalPath,
      resolvedPath: originalPath,
      isSymlink,
      symlinkBroken: true,
      sizeBytes: null,
      mtime: null,
      fileName,
      isEmpty: false,
    };
  }

  const stat = await safeLstat(resolved);
  if (!stat || !stat.isFile()) return null;

  return {
    originalPath,
    resolvedPath: resolved,
    isSymlink,
    symlinkBroken: false,
    sizeBytes: stat.size,
    mtime: stat.mtime.toISOString(),
    fileName,
    isEmpty: stat.size === 0,
  };
}
