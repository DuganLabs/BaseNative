-- @basenative/auth-webauthn — canonical schema
-- Lifted from t4bs (production-tested). Apply with:
--   wrangler d1 execute <DB_BINDING> --local  --file=./migrations/0001_webauthn_schema.sql
--   wrangler d1 execute <DB_BINDING> --remote --file=./migrations/0001_webauthn_schema.sql

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,                          -- random uuid
  handle          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role            TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user','moderator','admin')),
  role_changed_at INTEGER,
  role_changed_by TEXT,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS credentials (
  id           TEXT PRIMARY KEY,                             -- WebAuthn credentialID (base64url)
  user_id      TEXT NOT NULL,
  public_key   TEXT NOT NULL,                                -- base64url-encoded COSE pubkey
  counter      INTEGER NOT NULL DEFAULT 0,
  transports   TEXT,                                         -- JSON array: ['internal','hybrid',...]
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);

CREATE TABLE IF NOT EXISTS challenges (
  challenge   TEXT PRIMARY KEY,
  user_id     TEXT,                                          -- NULL for usernameless flows
  purpose     TEXT NOT NULL,                                 -- 'register' | 'authenticate'
  expires_at  INTEGER NOT NULL                               -- unix seconds; ≤ 5 min from creation
);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id          TEXT PRIMARY KEY,                              -- session token (cookie value)
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
