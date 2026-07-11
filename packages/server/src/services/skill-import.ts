import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gunzipSync, unzipSync } from "fflate";
import { parseTar } from "nanotar";
import type {
  InstallTarget,
  MultiTargetResponse,
  SkillLoadResult,
  SkillSource,
} from "@weave/shared";
import type { Db } from "../db/client";
import { loadEnv } from "../env";
import { copyDirReplace } from "../lib/fs-safe";
import { isWithin } from "../lib/path-guard";
import { scanSkillRoot } from "../scanner/skills";
import { installSkillFromDir } from "./skill-write";

const MAX_COMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_INFLATED_BYTES = 200 * 1024 * 1024;
const STAGING_TTL_MS = 2 * 60 * 60 * 1000;
const GITHUB_FETCH_TIMEOUT_MS = 30_000;
const STAGING_SCAN_DEPTH = 32;

export class SkillImportError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SkillImportError";
  }
}

interface StagingMeta {
  createdAt: string;
  expiresAt: string;
  source: SkillSource;
  skillName: string;
}

export function defaultStagingRoot(): string {
  return join(loadEnv().weaveHome, "staging");
}

async function existsAsync(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadFromLocalFolder(
  inputPath: string,
  skillDir: string,
  stagingRoot: string,
): Promise<void> {
  let real: string;
  try {
    real = await realpath(resolve(inputPath));
  } catch {
    throw new SkillImportError(`Path does not exist: ${inputPath}`);
  }

  let stagingReal: string | null = null;
  try {
    stagingReal = await realpath(stagingRoot);
  } catch {
    stagingReal = null;
  }
  if (stagingReal && isWithin(stagingReal, real)) {
    throw new SkillImportError("Refusing to import a path inside the staging directory");
  }

  const rootStat = await stat(real).catch(() => null);
  if (!rootStat || !rootStat.isDirectory()) {
    throw new SkillImportError(`Not a directory: ${inputPath}`);
  }

  let effectiveRoot = real;
  if (!(await existsAsync(join(real, "SKILL.md")))) {
    const entries = await readdir(real, { withFileTypes: true });
    const subdirsWithSkillMd: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (await existsAsync(join(real, entry.name, "SKILL.md"))) {
        subdirsWithSkillMd.push(entry.name);
      }
    }
    if (subdirsWithSkillMd.length !== 1) {
      throw new SkillImportError(
        "No SKILL.md found at the given path or in exactly one subdirectory",
      );
    }
    effectiveRoot = join(real, subdirsWithSkillMd[0]!);
  }

  await copyDirReplace(effectiveRoot, skillDir);
}

async function loadFromZip(zipPath: string, skillDir: string): Promise<void> {
  let real: string;
  try {
    real = await realpath(resolve(zipPath));
  } catch {
    throw new SkillImportError(`Path does not exist: ${zipPath}`);
  }

  const buf = await readFile(real);
  if (buf.byteLength > MAX_COMPRESSED_BYTES) {
    throw new SkillImportError(`Zip file exceeds ${MAX_COMPRESSED_BYTES} bytes compressed`);
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buf);
  } catch {
    throw new SkillImportError("Failed to read zip file");
  }

  const skillDirReal = await realpath(skillDir);
  let inflatedTotal = 0;

  for (const [rawPath, data] of Object.entries(entries)) {
    if (rawPath.endsWith("/")) continue;

    inflatedTotal += data.byteLength;
    if (inflatedTotal > MAX_INFLATED_BYTES) {
      throw new SkillImportError(`Zip contents exceed ${MAX_INFLATED_BYTES} bytes inflated`);
    }

    if (rawPath.startsWith("/") || rawPath.split("/").includes("..")) {
      throw new SkillImportError(`Rejected unsafe zip entry: ${rawPath}`);
    }

    const dest = resolve(skillDirReal, rawPath);
    if (!isWithin(skillDirReal, dest)) {
      throw new SkillImportError(`Rejected unsafe zip entry: ${rawPath}`);
    }

    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, data);
  }
}

interface ParsedGithubUrl {
  owner: string;
  repo: string;
  ref?: string;
  subpath?: string;
}

function parseGithubUrl(url: string): ParsedGithubUrl {
  const cleaned = url.replace(/^https?:\/\//, "").replace(/^github\.com\//, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) throw new SkillImportError(`Invalid GitHub URL: ${url}`);
  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/, "");
  if (parts[2] === "tree" && parts[3]) {
    const ref = parts[3];
    const subpath = parts.slice(4).join("/") || undefined;
    return { owner, repo, ref, subpath };
  }
  return { owner, repo };
}

async function fetchCodeloadTarball(owner: string, repo: string, ref: string): Promise<Uint8Array> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    throw new SkillImportError(
      `Failed to fetch from GitHub: ${error instanceof Error ? error.message : "network error"}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SkillImportError(`GitHub fetch failed with status ${response.status}`);
  }

  const buf = new Uint8Array(await response.arrayBuffer());
  if (buf.byteLength > MAX_COMPRESSED_BYTES) {
    throw new SkillImportError(`GitHub archive exceeds ${MAX_COMPRESSED_BYTES} bytes compressed`);
  }
  return buf;
}

async function writeArchiveEntry(
  skillDirReal: string,
  relPath: string,
  type: string | undefined,
  data: Uint8Array | undefined,
): Promise<void> {
  if (relPath.split("/").includes("..")) {
    throw new SkillImportError(`Rejected unsafe archive entry: ${relPath}`);
  }
  const dest = resolve(skillDirReal, relPath);
  if (!isWithin(skillDirReal, dest)) {
    throw new SkillImportError(`Rejected unsafe archive entry: ${relPath}`);
  }
  if (type === "directory") {
    await mkdir(dest, { recursive: true });
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, data ?? new Uint8Array());
}

async function loadFromGithub(
  url: string,
  explicitSubpath: string | undefined,
  explicitRef: string | undefined,
  skillDir: string,
): Promise<void> {
  const parsed = parseGithubUrl(url);
  const ref = explicitRef ?? parsed.ref ?? "HEAD";
  const subpath = explicitSubpath ?? parsed.subpath;

  const compressed = await fetchCodeloadTarball(parsed.owner, parsed.repo, ref);

  let inflated: Uint8Array;
  try {
    inflated = gunzipSync(compressed);
  } catch {
    throw new SkillImportError("Failed to decompress GitHub archive");
  }
  if (inflated.byteLength > MAX_INFLATED_BYTES) {
    throw new SkillImportError(`GitHub archive exceeds ${MAX_INFLATED_BYTES} bytes inflated`);
  }

  const entries = parseTar(inflated);
  const skillDirReal = await realpath(skillDir);
  const subSegments = subpath ? subpath.split("/").filter(Boolean) : [];

  for (const entry of entries) {
    if (entry.type !== "file" && entry.type !== "directory") continue;

    const segments = entry.name.split("/").filter(Boolean);
    segments.shift(); // strip the codeload archive's top-level "<repo>-<ref>/" segment
    if (segments.length === 0) continue;

    if (subSegments.length > 0) {
      const matches = subSegments.every((seg, i) => segments[i] === seg);
      if (!matches) continue;
      const remaining = segments.slice(subSegments.length);
      if (remaining.length === 0) continue;
      await writeArchiveEntry(skillDirReal, remaining.join("/"), entry.type, entry.data);
    } else {
      await writeArchiveEntry(skillDirReal, segments.join("/"), entry.type, entry.data);
    }
  }
}

/**
 * If the skill directory has no SKILL.md at its root but contains exactly
 * one subdirectory that does, promotes that subdirectory's contents up one
 * level. Handles zip/GitHub sources that wrap everything in a single folder.
 */
async function unwrapSingleTopLevelDir(skillDir: string): Promise<void> {
  if (await existsAsync(join(skillDir, "SKILL.md"))) return;

  const entries = await readdir(skillDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  if (dirs.length !== 1) return;

  const inner = join(skillDir, dirs[0]!.name);
  if (!(await existsAsync(join(inner, "SKILL.md")))) return;

  const tmp = `${skillDir}.unwrap-${randomUUID()}`;
  await rename(inner, tmp);
  await rm(skillDir, { recursive: true, force: true });
  await rename(tmp, skillDir);
}

async function withFileSizes(
  root: string,
  relPaths: string[],
): Promise<{ path: string; size: number }[]> {
  const out: { path: string; size: number }[] = [];
  for (const relPath of relPaths) {
    const fileStat = await stat(join(root, relPath)).catch(() => null);
    out.push({ path: relPath, size: fileStat?.size ?? 0 });
  }
  return out;
}

export interface LoadSkillOptions {
  stagingRoot?: string;
}

/**
 * Stages a skill from any of the four supported sources into
 * `<stagingRoot>/<uuid>/skill/`, validates it, and writes a meta.json with
 * a 2-hour expiry. Throws SkillImportError on any rejection.
 */
export async function loadSkill(
  _db: Db,
  source: SkillSource,
  options?: LoadSkillOptions,
): Promise<SkillLoadResult> {
  const stagingRoot = options?.stagingRoot ?? defaultStagingRoot();
  await mkdir(stagingRoot, { recursive: true });

  const stagingId = randomUUID();
  const stagingDir = join(stagingRoot, stagingId);
  const skillDir = join(stagingDir, "skill");
  await mkdir(skillDir, { recursive: true });

  try {
    if (source.kind === "localFolder") {
      await loadFromLocalFolder(source.path, skillDir, stagingRoot);
    } else if (source.kind === "zip") {
      await loadFromZip(source.path, skillDir);
    } else if (source.kind === "githubRepo") {
      await loadFromGithub(source.url, undefined, source.ref, skillDir);
    } else {
      await loadFromGithub(source.url, source.subpath, source.ref, skillDir);
    }

    await unwrapSingleTopLevelDir(skillDir);
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error instanceof SkillImportError
      ? error
      : new SkillImportError(error instanceof Error ? error.message : "Failed to load skill");
  }

  const candidates = await scanSkillRoot(stagingDir, {
    ignoreGlobs: [],
    maxScanDepth: STAGING_SCAN_DEPTH,
    scanRoot: stagingDir,
  });
  const candidate = candidates.find((item) => item.dirName === "skill");
  if (!candidate) {
    await rm(stagingDir, { recursive: true, force: true });
    throw new SkillImportError("No SKILL.md found in the provided source");
  }

  const now = Date.now();
  const expiresAt = new Date(now + STAGING_TTL_MS).toISOString();
  const skillName = candidate.skill.name ?? candidate.dirName;
  const meta: StagingMeta = {
    createdAt: new Date(now).toISOString(),
    expiresAt,
    source,
    skillName,
  };
  await writeFile(join(stagingDir, "meta.json"), JSON.stringify(meta));

  const installable = !candidate.skill.issues.some((issue) => issue.severity === "error");
  const relFiles = candidate.skill.files.map((path) => path.replace(/^skill\//, ""));

  return {
    stagingId,
    name: skillName,
    description: candidate.skill.description,
    files: await withFileSizes(skillDir, relFiles),
    issues: candidate.skill.issues,
    installable,
    expiresAt,
  };
}

export interface InstallStagedInput {
  stagingId: string;
  targets: InstallTarget[];
}

export type InstallStagedOutcome =
  | { status: "ok"; response: MultiTargetResponse }
  | { status: "not_found" | "conflict"; message: string };

/**
 * Installs a previously staged skill into one or more targets, delegating
 * the actual copy to installSkillFromDir. Deletes the staging directory only
 * when every target succeeds, so a partial failure can be retried.
 */
export async function installStaged(
  db: Db,
  input: InstallStagedInput,
  options?: LoadSkillOptions,
): Promise<InstallStagedOutcome> {
  const stagingRoot = options?.stagingRoot ?? defaultStagingRoot();
  const stagingDir = join(stagingRoot, input.stagingId);
  const skillDir = join(stagingDir, "skill");
  const metaPath = join(stagingDir, "meta.json");

  let meta: StagingMeta;
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8")) as StagingMeta;
  } catch {
    return { status: "not_found", message: `Staging not found or expired: ${input.stagingId}` };
  }

  if (new Date(meta.expiresAt).getTime() < Date.now()) {
    await rm(stagingDir, { recursive: true, force: true });
    return { status: "not_found", message: "Staging has expired" };
  }

  const candidates = await scanSkillRoot(stagingDir, {
    ignoreGlobs: [],
    maxScanDepth: STAGING_SCAN_DEPTH,
    scanRoot: stagingDir,
  });
  const candidate = candidates.find((item) => item.dirName === "skill");
  if (!candidate) {
    return { status: "not_found", message: "Staged skill directory is missing" };
  }

  const installable = !candidate.skill.issues.some((issue) => issue.severity === "error");
  if (!installable) {
    return { status: "conflict", message: "Staged skill has blocking validation issues" };
  }

  const skillName = candidate.skill.name ?? meta.skillName;
  const response = await installSkillFromDir(db, {
    sourceDir: skillDir,
    skillName,
    targets: input.targets,
    source: { kind: "import", stagingId: input.stagingId },
  });

  if (response.results.every((result) => result.ok)) {
    await rm(stagingDir, { recursive: true, force: true });
  }

  return { status: "ok", response };
}

export interface CleanupStagingOptions {
  stagingRoot?: string;
  ttlMs?: number;
}

/**
 * Removes staging directories past their TTL. Falls back to directory mtime
 * when meta.json is missing or unreadable, so a corrupt staging dir does not
 * live forever.
 */
export async function cleanupStaging(options?: CleanupStagingOptions): Promise<void> {
  const stagingRoot = options?.stagingRoot ?? defaultStagingRoot();
  const ttlMs = options?.ttlMs ?? STAGING_TTL_MS;

  let entries;
  try {
    entries = await readdir(stagingRoot, { withFileTypes: true });
  } catch {
    return;
  }

  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(stagingRoot, entry.name);
    const metaPath = join(dir, "meta.json");

    let expired: boolean;
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf8")) as Partial<StagingMeta>;
      const expiresAtMs = meta.expiresAt ? new Date(meta.expiresAt).getTime() : NaN;
      expired = Number.isFinite(expiresAtMs) ? expiresAtMs < now : true;
    } catch {
      const dirStat = await stat(dir).catch(() => null);
      expired = dirStat ? now - dirStat.mtimeMs > ttlMs : true;
    }

    if (expired) await rm(dir, { recursive: true, force: true });
  }
}
