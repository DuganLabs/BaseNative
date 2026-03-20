-- Initial schema for enterprise-v2

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed admin user (password: "admin123")
-- The hash is generated at startup; this insert uses a placeholder.
INSERT OR IGNORE INTO users (id, username, email, password_hash, role)
VALUES (1, 'admin', 'admin@example.com', '__SEED_HASH__', 'admin');
