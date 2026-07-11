import { createHash } from "node:crypto";
import { readFile, readdir, lstat, realpath } from "node:fs/promises";
import { join, relative } from "node:path";
import { isWithin } from "./path-guard";

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function hashFile(path: string): Promise<string> {
  return sha256Hex(await readFile(path));
}

export interface HashedFile {
  hash: string;
  mtimeMs: number;
  size: number;
}

export interface DirHashResult {
  dirHash: string;
  files: Map<string, HashedFile>;
}

/**
 * Hashes every regular file under `root` (recursively). Symlinks whose
 * realpath escapes `root` are skipped. `dirHash` is the sha256 of the sorted
 * "relpath:filehash\n" lines, so two directory trees with identical contents
 * produce identical hashes regardless of traversal order.
 */
export async function hashDir(root: string): Promise<DirHashResult> {
  const realRoot = await realpath(root);
  const files = new Map<string, HashedFile>();

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        let resolved: string;
        try {
          resolved = await realpath(fullPath);
        } catch {
          continue;
        }
        if (!isWithin(realRoot, resolved)) continue;
        const stat = await lstat(resolved);
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else if (stat.isFile()) {
          files.set(relative(realRoot, fullPath), {
            hash: await hashFile(resolved),
            mtimeMs: stat.mtimeMs,
            size: stat.size,
          });
        }
        continue;
      }
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await lstat(fullPath);
        files.set(relative(realRoot, fullPath), {
          hash: await hashFile(fullPath),
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        });
      }
    }
  }

  await walk(realRoot);

  const lines = Array.from(files.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, file]) => `${path}:${file.hash}\n`)
    .join("");
  return { dirHash: sha256Hex(lines), files };
}
