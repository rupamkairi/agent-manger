import { mkdir, readFile, stat, writeFile, appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Db } from "../db/client";
import type { WorkflowEvents } from "./events";

export class JobLogStore {
  readonly root: string;
  constructor(private readonly db: Db, private readonly events: WorkflowEvents, weaveHome?: string) {
    this.root = join(weaveHome ?? process.env.WEAVE_HOME ?? join(homedir(), ".weave"), "logs", "jobs");
  }

  async create(jobId: string): Promise<{ id: string; stdoutPath: string; stderrPath: string }> {
    const dir = join(this.root, jobId);
    const stdoutPath = join(dir, "stdout.log");
    const stderrPath = join(dir, "stderr.log");
    await mkdir(dir, { recursive: true });
    await Promise.all([writeFile(stdoutPath, ""), writeFile(stderrPath, "")]);
    const id = crypto.randomUUID();
    await this.db.run(
      "INSERT INTO job_logs (id, job_id, stdout_path, stderr_path, bytes) VALUES (?, ?, ?, ?, 0)",
      [id, jobId, stdoutPath, stderrPath],
    );
    return { id, stdoutPath, stderrPath };
  }

  async append(jobId: string, stream: "stdout" | "stderr", chunk: string): Promise<void> {
    const row = await this.db.get<{ stdout_path: string; stderr_path: string; parent_job_id: string | null }>(
      `SELECT l.stdout_path, l.stderr_path, j.parent_job_id FROM job_logs l
       JOIN jobs j ON j.id = l.job_id WHERE l.job_id = ?`, [jobId],
    );
    if (!row) return;
    const target = stream === "stdout" ? row.stdout_path : row.stderr_path;
    const offset = (await stat(target).catch(() => null))?.size ?? 0;
    await appendFile(target, chunk);
    await this.db.run("UPDATE job_logs SET bytes = bytes + ? WHERE job_id = ?", [Buffer.byteLength(chunk), jobId]);
    const event = { jobId, stream, chunk, offset };
    this.events.emitLog(event);
    if (row.parent_job_id) this.events.emitLog(event, row.parent_job_id);
  }

  async read(jobId: string): Promise<Array<{ jobId: string; stream: "stdout" | "stderr"; chunk: string; offset: number }>> {
    const rows = await this.db.all<{ job_id: string; stdout_path: string; stderr_path: string }>(
      `SELECT l.job_id, l.stdout_path, l.stderr_path FROM job_logs l
       JOIN jobs j ON j.id = l.job_id
       WHERE l.job_id = ? OR j.parent_job_id = ? ORDER BY j.queued_at, j.step_id`, [jobId, jobId],
    );
    const events: Array<{ jobId: string; stream: "stdout" | "stderr"; chunk: string; offset: number }> = [];
    for (const row of rows) {
      const [stdout, stderr] = await Promise.all([
        readFile(row.stdout_path, "utf8").catch(() => ""), readFile(row.stderr_path, "utf8").catch(() => ""),
      ]);
      if (stdout) events.push({ jobId: row.job_id, stream: "stdout", chunk: stdout, offset: 0 });
      if (stderr) events.push({ jobId: row.job_id, stream: "stderr", chunk: stderr, offset: 0 });
    }
    return events;
  }

  async bytes(jobId: string): Promise<number> {
    const row = await this.db.get<{ stdout_path: string; stderr_path: string }>(
      "SELECT stdout_path, stderr_path FROM job_logs WHERE job_id = ?", [jobId],
    );
    if (!row) return 0;
    const sizes = await Promise.all([stat(row.stdout_path).catch(() => null), stat(row.stderr_path).catch(() => null)]);
    return sizes.reduce((total, value) => total + (value?.size ?? 0), 0);
  }
}
