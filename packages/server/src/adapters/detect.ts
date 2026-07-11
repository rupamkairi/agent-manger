import type { AgentDetectionResult } from "@weave/shared";
import type { Db } from "../db/client";
import { listAdapters } from "./registry";
import type { AgentAdapter } from "./types";

const VERSION_TOKEN_RE = /\d+\.\d+(\.\d+)?(-[0-9A-Za-z.-]+)?/;

export async function detectAgent(
  adapter: AgentAdapter,
  timeoutMs: number,
): Promise<AgentDetectionResult> {
  const detectedAt = new Date().toISOString();

  let binaryPath: string | null = null;
  for (const candidate of adapter.binaryCandidates) {
    const found = Bun.which(candidate);
    if (found) {
      binaryPath = found;
      break;
    }
  }

  if (!binaryPath) {
    return {
      agentId: adapter.id,
      state: "missing",
      binaryPath: null,
      version: null,
      detectedAt,
      error: null,
    };
  }

  try {
    const proc = Bun.spawn(adapter.versionCommand, {
      stdout: "pipe",
      stderr: "pipe",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);

    const firstLine = stdout.split("\n").find((line) => line.trim().length > 0) ?? "";
    const match = firstLine.match(VERSION_TOKEN_RE);

    if (exitCode !== 0 || !match) {
      return {
        agentId: adapter.id,
        state: "unknown",
        binaryPath,
        version: null,
        detectedAt,
        error: `Could not parse version output (exit code ${exitCode})`,
      };
    }

    return {
      agentId: adapter.id,
      state: "installed",
      binaryPath,
      version: match[0],
      detectedAt,
      error: null,
    };
  } catch (error) {
    return {
      agentId: adapter.id,
      state: "unknown",
      binaryPath,
      version: null,
      detectedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function detectAll(timeoutMs: number): Promise<AgentDetectionResult[]> {
  return Promise.all(listAdapters().map((adapter) => detectAgent(adapter, timeoutMs)));
}

export async function persistDetection(db: Db, result: AgentDetectionResult): Promise<void> {
  await db.run(
    `INSERT INTO agent_detections (agent_id, state, binary_path, version, error, detected_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET
       state = excluded.state,
       binary_path = excluded.binary_path,
       version = excluded.version,
       error = excluded.error,
       detected_at = excluded.detected_at`,
    [
      result.agentId,
      result.state,
      result.binaryPath,
      result.version,
      result.error,
      result.detectedAt,
    ],
  );
}
