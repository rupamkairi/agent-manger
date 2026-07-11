import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Skill, SkillIssueCode, SkillStatus, SkillValidationIssue } from "@weave/shared";
import { extractFrontmatter } from "./frontmatter";
import { isPathAllowed, resolveSymlink, safeLstat, type GlobMatchOptions } from "./walk";

const ALLOWED_METADATA_KEYS = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "version",
]);

export interface SkillCandidate {
  dirName: string;
  originalPath: string;
  resolvedPath: string;
  isSymlink: boolean;
  symlinkBroken: boolean;
  skill: Skill;
  sizeBytes: number | null;
  mtime: string | null;
}

type SkillScanOptions = GlobMatchOptions & { scanRoot: string };

function issue(code: SkillIssueCode, severity: "warning" | "error", message: string, file: string | null = null): SkillValidationIssue {
  return { code, severity, message, file };
}

function statusFromIssues(issues: SkillValidationIssue[], unreadable: boolean): SkillStatus {
  if (unreadable) return "unknown";
  if (issues.some((i) => i.severity === "error")) return "invalid";
  if (issues.some((i) => i.severity === "warning")) return "warning";
  return "valid";
}

function extractReferencedPaths(body: string): string[] {
  const paths = new Set<string>();

  const linkPattern = /\]\((\.\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(body))) {
    if (match[1]) paths.add(match[1]);
  }

  const codePattern = /`(\.\/[^`\s]+)`/g;
  while ((match = codePattern.exec(body))) {
    if (match[1]) paths.add(match[1]);
  }

  return Array.from(paths);
}

async function listFilesRecursive(
  root: string,
  current: string,
  out: string[],
  options: SkillScanOptions,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(current, entry.name);
    if (!isPathAllowed(root, full, options)) continue;
    if (entry.isDirectory()) {
      await listFilesRecursive(root, full, out, options);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      out.push(relative(root, full));
    }
  }
}

async function buildSkill(
  dirName: string,
  skillDirAbsolute: string,
  options: SkillScanOptions,
): Promise<{
  skill: Skill;
  unreadable: boolean;
}> {
  const issues: SkillValidationIssue[] = [];
  const skillMdPath = join(skillDirAbsolute, "SKILL.md");
  const stat = await safeLstat(skillMdPath);

  if (!stat) {
    issues.push(issue("missing-skill-md", "error", "SKILL.md is missing from this skill directory."));
    const files: string[] = [];
    await listFilesRecursive(options.scanRoot, skillDirAbsolute, files, options);
    return {
      skill: {
        name: null,
        description: null,
        dirName,
        status: statusFromIssues(issues, false),
        issues,
        files,
      },
      unreadable: false,
    };
  }

  let content: string;
  try {
    content = await readFile(skillMdPath, "utf8");
  } catch {
    const files: string[] = [];
    await listFilesRecursive(options.scanRoot, skillDirAbsolute, files, options);
    return {
      skill: {
        name: null,
        description: null,
        dirName,
        status: "unknown",
        issues: [],
        files,
      },
      unreadable: true,
    };
  }

  const { data, error, body } = extractFrontmatter(content);

  let name: string | null = null;
  let description: string | null = null;

  if (error || data === null) {
    issues.push(
      issue("frontmatter-parse-error", "error", error ?? "Failed to parse SKILL.md frontmatter."),
    );
  } else {
    const rawName = data.name;
    if (typeof rawName === "string" && rawName.trim().length > 0) {
      name = rawName;
    } else {
      issues.push(issue("missing-name", "error", "SKILL.md frontmatter is missing a `name` field."));
    }

    const rawDescription = data.description;
    if (typeof rawDescription === "string" && rawDescription.trim().length > 0) {
      description = rawDescription;
    } else {
      issues.push(
        issue("missing-description", "warning", "SKILL.md frontmatter is missing a `description` field."),
      );
    }

    for (const key of Object.keys(data)) {
      if (!ALLOWED_METADATA_KEYS.has(key)) {
        issues.push(
          issue(
            "unknown-metadata-field",
            "warning",
            `Unknown frontmatter field \`${key}\`.`,
            "SKILL.md",
          ),
        );
      }
    }

    for (const refPath of extractReferencedPaths(body)) {
      const resolved = join(skillDirAbsolute, refPath);
      const refStat = await safeLstat(resolved);
      if (!refStat) {
        issues.push(
          issue(
            "referenced-file-missing",
            "warning",
            `Referenced file "${refPath}" does not exist.`,
            refPath,
          ),
        );
      }
    }
  }

  const files: string[] = [];
  await listFilesRecursive(options.scanRoot, skillDirAbsolute, files, options);

  return {
    skill: {
      name,
      description,
      dirName,
      status: statusFromIssues(issues, false),
      issues,
      files,
    },
    unreadable: false,
  };
}

export async function scanSkillRoot(
  root: string,
  options: SkillScanOptions,
): Promise<SkillCandidate[]> {
  if (!isPathAllowed(options.scanRoot, root, options)) return [];
  const rootStat = await safeLstat(root);
  if (!rootStat) return [];

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const candidates: SkillCandidate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    const dirName = entry.name;
    const originalPath = join(root, dirName);
    if (!isPathAllowed(options.scanRoot, originalPath, options)) continue;
    const { resolved, isSymlink, broken } = await resolveSymlink(originalPath);

    if (broken) {
      const issues: SkillValidationIssue[] = [
        issue("broken-symlink", "error", "Symlink target does not exist."),
      ];
      candidates.push({
        dirName,
        originalPath,
        resolvedPath: originalPath,
        isSymlink,
        symlinkBroken: true,
        skill: {
          name: null,
          description: null,
          dirName,
          status: statusFromIssues(issues, false),
          issues,
          files: [],
        },
        sizeBytes: null,
        mtime: null,
      });
      continue;
    }

    const resolvedStat = await safeLstat(resolved);
    if (!resolvedStat || !resolvedStat.isDirectory()) continue;

    const { skill, unreadable } = await buildSkill(dirName, resolved, options);

    candidates.push({
      dirName,
      originalPath,
      resolvedPath: resolved,
      isSymlink,
      symlinkBroken: false,
      skill: unreadable ? { ...skill, status: "unknown" } : skill,
      sizeBytes: resolvedStat.size,
      mtime: resolvedStat.mtime.toISOString(),
    });
  }

  return candidates;
}
