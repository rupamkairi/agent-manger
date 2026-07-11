CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL,
  parent_job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  step_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('queued','running','succeeded','failed','cancelled')),
  attempt INTEGER NOT NULL DEFAULT 1,
  input_json TEXT NOT NULL DEFAULT '{}',
  output TEXT,
  error TEXT,
  log_ref TEXT,
  queued_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT
);

CREATE INDEX idx_jobs_parent ON jobs(parent_job_id);
CREATE INDEX idx_jobs_state ON jobs(state);
CREATE INDEX idx_jobs_workflow ON jobs(workflow_id);

CREATE TABLE job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  stdout_path TEXT NOT NULL,
  stderr_path TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  spec_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  inputs_json TEXT NOT NULL DEFAULT '{}',
  next_run_at TEXT,
  last_run_at TEXT,
  missed_run_policy TEXT NOT NULL CHECK (missed_run_policy IN ('skip','runOnce'))
);

CREATE INDEX idx_schedules_next_run ON schedules(enabled, next_run_at);
