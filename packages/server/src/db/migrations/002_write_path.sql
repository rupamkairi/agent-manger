CREATE TABLE skill_installs (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global','project')),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  installed_path TEXT NOT NULL,
  source_json TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_skill_installs_skill_name ON skill_installs(skill_name);
