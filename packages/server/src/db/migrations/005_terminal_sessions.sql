CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  cwd TEXT NOT NULL,
  shell TEXT NOT NULL,
  pid INTEGER,
  created_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);

CREATE INDEX idx_terminal_sessions_project ON terminal_sessions(project_id);
