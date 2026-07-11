import type { ConflictTopic, InstructionConflict, Scope } from "@weave/shared";
import type { Db } from "../db/client";
import { getResourceContent, listResourcesByKind } from "./resources";

interface TopicRule {
  topic: ConflictTopic;
  pattern: RegExp;
}

const TOPIC_RULES: TopicRule[] = [
  { topic: "package-manager", pattern: /\bnpm\b|\bpnpm\b|\byarn\b|\bbun\b/gi },
  { topic: "orm", pattern: /\bprisma\b|\bdrizzle\b|\btypeorm\b/gi },
  { topic: "formatter", pattern: /\bprettier\b|\bbiome\b/gi },
  {
    topic: "indentation",
    pattern: /\b(tabs?|spaces?)\b(?=(?:.{0,20}indent))|indent\w*(?:.{0,20})\b(tabs?|spaces?)\b/gi,
  },
  { topic: "commit-style", pattern: /conventional commits?|gitmoji/gi },
];

interface Match {
  value: string;
  index: number;
}

function normalizeValue(raw: string): string {
  return raw.toLowerCase().replace(/s$/, "");
}

function findMatches(rule: TopicRule, content: string): Match[] {
  const matches: Match[] = [];
  const regex = new RegExp(rule.pattern);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const raw = (m[1] ?? m[2] ?? m[0]) as string;
    matches.push({ value: normalizeValue(raw), index: m.index });
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
  return matches;
}

function excerptAround(content: string, index: number): string {
  const start = Math.max(0, index - 150);
  const end = Math.min(content.length, index + 150);
  return content.slice(start, end).slice(0, 300);
}

interface FileTopicInfo {
  resourceId: string;
  fileName: string;
  value: string;
  excerpt: string;
}

/**
 * Detects "possible" conflicts between instruction files whose text picks a
 * single, differing value for the same topic (e.g. one file says npm, another
 * pnpm). Files that mention two or more values for a topic are self-ambiguous
 * and skipped for that topic, since we cannot tell which one they intend.
 */
export async function detectConflicts(
  db: Db,
  filters: { scope: Scope; projectId?: string },
): Promise<InstructionConflict[]> {
  const resources = await listResourcesByKind(db, "instruction", filters);
  const conflicts: InstructionConflict[] = [];

  for (const rule of TOPIC_RULES) {
    const perFile: FileTopicInfo[] = [];

    for (const resource of resources) {
      if (resource.kind !== "instruction") continue;
      const content = await getResourceContent(db, resource.id);
      if (!content || content.content === null) continue;

      const matches = findMatches(rule, content.content);
      if (matches.length === 0) continue;

      const distinctValues = new Set(matches.map((m) => m.value));
      if (distinctValues.size > 1) continue;

      const first = matches[0]!;
      perFile.push({
        resourceId: resource.id,
        fileName: resource.instruction.fileName,
        value: first.value,
        excerpt: excerptAround(content.content, first.index),
      });
    }

    for (let i = 0; i < perFile.length; i++) {
      for (let j = i + 1; j < perFile.length; j++) {
        const a = perFile[i]!;
        const b = perFile[j]!;
        if (a.value === b.value) continue;
        conflicts.push({
          topic: rule.topic,
          fileA: a.fileName,
          fileB: b.fileName,
          resourceIdA: a.resourceId,
          resourceIdB: b.resourceId,
          valueA: a.value,
          valueB: b.value,
          excerptA: a.excerpt,
          excerptB: b.excerpt,
          confidence: "possible",
        });
      }
    }
  }

  return conflicts;
}
