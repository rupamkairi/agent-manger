CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  added_at TEXT NOT NULL,
  last_scanned_at TEXT
);

CREATE TABLE agent_detections (
  agent_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  binary_path TEXT,
  version TEXT,
  error TEXT,
  detected_at TEXT NOT NULL
);

CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('skill','instruction','memory','config')),
  path TEXT NOT NULL,
  original_path TEXT NOT NULL,
  is_symlink INTEGER DEFAULT 0,
  symlink_broken INTEGER DEFAULT 0,
  scope TEXT NOT NULL CHECK (scope IN ('global','project')),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  size_bytes INTEGER,
  mtime TEXT,
  last_scanned_at TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (kind, original_path, agent_id, scope, project_id)
);

CREATE INDEX idx_resources_kind ON resources(kind);
CREATE INDEX idx_resources_project ON resources(project_id);
CREATE INDEX idx_resources_agent ON resources(agent_id);

CREATE TABLE skill_issues (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  file TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
