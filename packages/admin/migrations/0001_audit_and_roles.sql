-- @basenative/admin — base migration
-- Adds an audit_log table plus role columns + indexes on users.

CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT,
  actor_handle TEXT,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  meta_json    TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target  ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Role column for users. Apply only if your users table doesn't already
-- have one. SQLite ignores `IF NOT EXISTS` on ALTER TABLE columns, so wrap
-- in your migration runner's column-existence check.
-- ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
-- ALTER TABLE users ADD COLUMN role_set_by TEXT;
-- ALTER TABLE users ADD COLUMN role_set_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Submissions queue (rename per your domain).
CREATE TABLE IF NOT EXISTS submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category     TEXT NOT NULL,
  phrase       TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   INTEGER NOT NULL,
  decided_by   TEXT,
  decided_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_submissions_status  ON submissions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_creator ON submissions(submitted_by);
