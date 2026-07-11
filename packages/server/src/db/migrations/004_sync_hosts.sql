ALTER TABLE jobs ADD COLUMN origin_host TEXT;

ALTER TABLE schedules ADD COLUMN owner_host TEXT;

CREATE INDEX idx_jobs_origin_host ON jobs(origin_host);

CREATE INDEX idx_schedules_owner_host ON schedules(owner_host);
