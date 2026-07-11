import { realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { Stats } from "node:fs";
import { lstat } from "node:fs/promises";

export async function safeLstat(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch {
    return null;
  }
}

export interface SymlinkResolution {
  resolved: string;
  isSymlink: boolean;
  broken: boolean;
}

export async function resolveSymlink(path: string): Promise<SymlinkResolution> {
  const stat = await safeLstat(path);
  if (!stat) {
    return { resolved: path, isSymlink: false, broken: false };
  }
  const isSymlink = stat.isSymbolicLink();
  if (!isSymlink) {
    return { resolved: path, isSymlink: false, broken: false };
  }
  try {
    const resolved = await realpath(path);
    return { resolved, isSymlink: true, broken: false };
  } catch {
    return { resolved: path, isSymlink: true, broken: true };
  }
}

export function isWithinDepth(root: string, path: string, maxDepth: number): boolean {
  const rel = relative(root, path);
  if (rel.startsWith("..")) return false;
  const depth = rel.split("/").filter(Boolean).length;
  return depth <= maxDepth;
}

export interface GlobMatchOptions {
  ignoreGlobs: string[];
  maxScanDepth: number;
}

export function isIgnoredPath(scanRoot: string, path: string, options: GlobMatchOptions): boolean {
  const rel = relative(scanRoot, path);
  if (rel.startsWith("..")) return false;
  return options.ignoreGlobs.some((glob) => new Bun.Glob(glob).match(rel));
}

export function isPathAllowed(
  scanRoot: string,
  path: string,
  options: GlobMatchOptions,
): boolean {
  return !isIgnoredPath(scanRoot, path, options) && isWithinDepth(scanRoot, path, options.maxScanDepth);
}

/**
 * Resolves a set of absolute file patterns (literal paths or glob patterns
 * such as "~/.claude/memory/**" already expanded to absolute form) against
 * a scan root, honoring ignore globs and max depth (both evaluated relative
 * to `scanRoot`).
 */
export async function globMatch(
  scanRoot: string,
  absolutePatterns: string[],
  options: GlobMatchOptions,
): Promise<string[]> {
  const results = new Set<string>();

  for (const pattern of absolutePatterns) {
    const { base, rest } = splitGlobPattern(pattern);

    if (!rest || !/[*?[\]{}]/.test(rest)) {
      const literalPath = rest ? `${base}/${rest}` : base;
      const stat = await safeLstat(literalPath);
      if (!stat) continue;
      if (!isPathAllowed(scanRoot, literalPath, options)) continue;
      results.add(literalPath);
      continue;
    }

    const baseStat = await safeLstat(base);
    if (!baseStat) continue;

    const glob = new Bun.Glob(rest);
    try {
      for await (const match of glob.scan({
        cwd: base,
        dot: true,
        followSymlinks: false,
      })) {
        const absPath = resolve(base, match);
        if (!isPathAllowed(scanRoot, absPath, options)) continue;
        results.add(absPath);
      }
    } catch {
      continue;
    }
  }

  return Array.from(results);
}

export interface SplitGlobPattern {
  base: string;
  rest: string;
}

/**
 * Splits an absolute glob pattern into a concrete base directory (the
 * longest prefix of path segments containing no glob characters) and the
 * remaining glob pattern relative to that base, so Bun.Glob can scan from
 * a real directory instead of the filesystem root.
 */
export function splitGlobPattern(absolutePattern: string): SplitGlobPattern {
  const segments = absolutePattern.split("/");
  const baseSegments: string[] = [];
  let i = 0;
  for (; i < segments.length; i++) {
    const seg = segments[i]!;
    if (/[*?[\]{}]/.test(seg)) break;
    baseSegments.push(seg);
  }
  const base = baseSegments.join("/") || "/";
  const rest = segments.slice(i).join("/") || "";
  return { base, rest };
}
