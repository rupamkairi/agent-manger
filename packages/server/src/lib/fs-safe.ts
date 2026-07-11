import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { hashDir } from "./hash";

/**
 * Writes to a temporary sibling then renames over the destination, so
 * readers never observe a partially written file.
 */
export async function writeFileAtomic(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = join(dirname(path), `.${crypto.randomUUID()}.tmp`);
  try {
    await writeFile(tmpPath, data);
    await rename(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, { force: true });
    throw error;
  }
}

/**
 * Replaces `dest` with a copy of `src`: copies into a temporary sibling,
 * removes any existing destination, then renames into place.
 * Returns the number of files copied.
 */
export async function copyDirReplace(src: string, dest: string): Promise<number> {
  await mkdir(dirname(dest), { recursive: true });
  const tmpDest = join(dirname(dest), `.${crypto.randomUUID()}.tmp`);
  try {
    await cp(src, tmpDest, { recursive: true, verbatimSymlinks: false });
    await rm(dest, { recursive: true, force: true });
    await rename(tmpDest, dest);
  } catch (error) {
    await rm(tmpDest, { recursive: true, force: true });
    throw error;
  }
  const { files } = await hashDir(dest);
  return files.size;
}

export async function removeDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}
