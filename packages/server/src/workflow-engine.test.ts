import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowDefinitionSchema, type WorkflowDefinition } from "@weave/shared";
import { createDb, type Db } from "./db/client";
import { runMigrations } from "./db/migrate";
import { checkWorkflowDependencies } from "./services/workflow-dependencies";
import { createWorkflow, getWorkflow, listWorkflows, updateWorkflow } from "./services/workflows";
import { captureOutput, renderTemplate } from "./engine/templates";
import { recoverInterruptedJobs } from "./services/jobs";

const roots: string[] = [];
async function setup(): Promise<{ db: Db; root: string }> {
  const root = await mkdtemp(join(tmpdir(), "weave-workflow-test-"));
  roots.push(root);
  const db = createDb(join(root, "weave.db"));
  await runMigrations(db);
  return { db, root };
}
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function definition(root: string): WorkflowDefinition {
  return {
    id: "review-code", name: "Review code", description: "", version: 1, projectPath: root,
    inputs: [{ key: "topic", label: "Topic", required: true }], outputs: {},
    failurePolicy: "stopOnFirstFailure", defaultTimeoutMs: 10_000,
    steps: [{
      id: "review", name: "Review", agentId: "codex", requiredSkills: ["reviewer"],
      requiredInstructions: ["AGENTS.md"], requiredConfigs: [], after: [], prompt: "Review {{inputs.topic}}",
      inputBindings: {}, outputCapture: "stdout", timeoutMs: 5_000,
      retry: { maxAttempts: 2, backoffMs: 1, backoffMultiplier: 2 }, continueOnFailure: false,
    }],
  };
}

describe("workflow services", () => {
  it("round-trips validated workflow definitions and summaries", async () => {
    const { db, root } = await setup();
    const created = await createWorkflow(db, definition(root));
    expect((await getWorkflow(db, created.id))?.steps[0]?.id).toBe("review");
    expect((await listWorkflows(db))[0]?.name).toBe("Review code");
    const updated = await updateWorkflow(db, created.id, { ...created, name: "Review repository", version: 2 });
    expect(updated?.version).toBe(2);
  });

  it("checks exact detected agents and indexed resources without filesystem guessing", async () => {
    const { db, root } = await setup();
    const workflow = definition(root);
    await db.run("INSERT INTO projects (id, name, root_path, added_at) VALUES (?, ?, ?, ?)", ["p1", "P1", root, new Date().toISOString()]);
    await db.run("INSERT INTO agent_detections (agent_id, state, binary_path, detected_at) VALUES (?, ?, ?, ?)", ["codex", "installed", "/usr/bin/codex", new Date().toISOString()]);
    await db.run(`INSERT INTO resources
      (id, kind, path, original_path, scope, project_id, agent_id, last_scanned_at, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["instruction", "instruction", join(root, "AGENTS.md"), "AGENTS.md", "project", "p1", "codex", new Date().toISOString(), JSON.stringify({ fileName: "AGENTS.md" })]);
    let check = await checkWorkflowDependencies(db, workflow);
    expect(check.ok).toBe(false);
    expect(check.items.find((item) => item.name === "reviewer")?.status).toBe("missing");
    await db.run(`INSERT INTO resources
      (id, kind, path, original_path, scope, project_id, agent_id, last_scanned_at, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["skill", "skill", join(root, ".codex/skills/reviewer/SKILL.md"), "reviewer", "project", "p1", "codex", new Date().toISOString(), JSON.stringify({ skill: { name: "reviewer" } })]);
    check = await checkWorkflowDependencies(db, workflow);
    expect(check.ok).toBe(true);
    expect(check.items.every((item) => item.status === "found")).toBe(true);
  });

  it("renders only documented input/step references and captures output modes", () => {
    const context = { inputs: { topic: "auth" }, steps: { inspect: "done" } };
    expect(renderTemplate("Check {{inputs.topic}} after {{steps.inspect.output}}", context)).toBe("Check auth after done");
    expect(renderTemplate("Check ${{ inputs.topic }} after ${{ steps.inspect.output }}", context)).toBe("Check auth after done");
    expect(captureOutput("one\ntwo\n", "lastLine")).toBe("two");
    expect(captureOutput("```json\n{\"ok\":true}\n```", "jsonBlock")).toBe('{"ok":true}');
  });

  it("rejects unknown dependencies and dependency cycles", async () => {
    const { root } = await setup();
    const base = definition(root);
    const unknown = structuredClone(base);
    unknown.steps[0]!.after = ["missing-step"];
    expect(WorkflowDefinitionSchema.safeParse(unknown).success).toBe(false);

    const cycle = structuredClone(base);
    cycle.steps = [
      { ...cycle.steps[0]!, id: "first", after: ["second"] },
      { ...cycle.steps[0]!, id: "second", after: ["first"] },
    ];
    expect(WorkflowDefinitionSchema.safeParse(cycle).success).toBe(false);
  });

  it("marks persisted queued and running jobs as interrupted on boot", async () => {
    const { db } = await setup();
    const now = new Date().toISOString();
    for (const [id, state] of [["queued-job", "queued"], ["running-job", "running"], ["done-job", "succeeded"]] as const) {
      await db.run(
        `INSERT INTO jobs
          (id, workflow_id, parent_job_id, step_id, state, attempt, input_json, queued_at)
         VALUES (?, NULL, NULL, NULL, ?, 1, '{}', ?)`,
        [id, state, now],
      );
    }
    expect(await recoverInterruptedJobs(db)).toBe(2);
    expect((await db.get<{ state: string }>("SELECT state FROM jobs WHERE id = 'queued-job'"))?.state).toBe("failed");
    expect((await db.get<{ state: string }>("SELECT state FROM jobs WHERE id = 'running-job'"))?.state).toBe("failed");
    expect((await db.get<{ state: string }>("SELECT state FROM jobs WHERE id = 'done-job'"))?.state).toBe("succeeded");
  });
});
