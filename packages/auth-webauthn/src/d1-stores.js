// Built with BaseNative — basenative.dev
/**
 * Cloudflare D1 store factory for @basenative/auth-webauthn.
 *
 * Creates the four stores expected by `webauthnAdapter`. The schema lives
 * in ../migrations/0001_webauthn_schema.sql and is also exported as the
 * `migration` string constant from this module so consumers can apply it
 * programmatically (e.g. via wrangler scripts) without reading the file.
 *
 * Field mappings match the t4bs reference implementation. If your DB
 * already exists with a slightly different shape, write a custom store
 * factory that satisfies the same interface — see README "storage contract".
 */

export const migration = `-- @basenative/auth-webauthn — D1 schema
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  handle          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role            TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user','moderator','admin')),
  role_changed_at INTEGER,
  role_changed_by TEXT,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS credentials (
  id          TEXT PRIMARY KEY,            -- WebAuthn credentialID (base64url)
  user_id     TEXT NOT NULL,
  public_key  TEXT NOT NULL,               -- base64url-encoded COSE pubkey
  counter     INTEGER NOT NULL DEFAULT 0,
  transports  TEXT,                        -- JSON array
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);

CREATE TABLE IF NOT EXISTS challenges (
  challenge   TEXT PRIMARY KEY,
  user_id     TEXT,                        -- NULL for usernameless flows
  purpose     TEXT NOT NULL,               -- 'register' | 'authenticate'
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id          TEXT PRIMARY KEY,            -- session token (cookie value)
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
`;

/**
 * Build the four-store object from a Cloudflare D1 binding.
 *
 * @param {D1Database} DB
 * @returns {{ users, credentials, challenges, userSessions }}
 */
export function d1WebAuthnStores(DB) {
  if (!DB || typeof DB.prepare !== 'function') {
    throw new Error('d1WebAuthnStores: expected a D1Database binding');
  }
  return {
    users: d1Users(DB),
    credentials: d1Credentials(DB),
    challenges: d1Challenges(DB),
    userSessions: d1UserSessions(DB),
  };
}

export function d1Users(DB) {
  return {
    async getByHandle(handle) {
      return await DB.prepare(
        'SELECT id, handle, role FROM users WHERE handle=?1',
      )
        .bind(handle)
        .first();
    },
    async getById(id) {
      return await DB.prepare('SELECT id, handle, role FROM users WHERE id=?1')
        .bind(id)
        .first();
    },
    async create({ id, handle }) {
      await DB.prepare('INSERT INTO users (id, handle) VALUES (?1, ?2)')
        .bind(id, handle)
        .run();
      return { id, handle, role: 'user' };
    },
    async setRole(id, role, changedBy) {
      await DB.prepare(
        'UPDATE users SET role=?1, role_changed_at=unixepoch(), role_changed_by=?2 WHERE id=?3',
      )
        .bind(role, changedBy ?? null, id)
        .run();
    },
  };
}

export function d1Credentials(DB) {
  return {
    async listByUser(userId) {
      const r = await DB.prepare(
        'SELECT id, public_key AS publicKey, counter, transports FROM credentials WHERE user_id=?1',
      )
        .bind(userId)
        .all();
      return (r.results || []).map((c) => ({
        ...c,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      }));
    },
    async getById(credId) {
      const r = await DB.prepare(
        'SELECT id, user_id AS userId, public_key AS publicKey, counter, transports FROM credentials WHERE id=?1',
      )
        .bind(credId)
        .first();
      if (!r) return null;
      return {
        ...r,
        transports: r.transports ? JSON.parse(r.transports) : undefined,
      };
    },
    async create({ id, userId, publicKey, counter, transports }) {
      await DB.prepare(
        'INSERT INTO credentials (id, user_id, public_key, counter, transports) VALUES (?1,?2,?3,?4,?5)',
      )
        .bind(
          id,
          userId,
          publicKey,
          counter || 0,
          transports ? JSON.stringify(transports) : null,
        )
        .run();
    },
    async updateCounter(id, counter) {
      await DB.prepare('UPDATE credentials SET counter=?1 WHERE id=?2')
        .bind(counter, id)
        .run();
    },
  };
}

export function d1Challenges(DB) {
  return {
    async create({ challenge, userId, purpose, ttlSeconds = 300 }) {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
      await DB.prepare(
        'INSERT INTO challenges (challenge, user_id, purpose, expires_at) VALUES (?1,?2,?3,?4)',
      )
        .bind(challenge, userId ?? null, purpose, expiresAt)
        .run();
    },
    async consume(challenge, purpose) {
      const r = await DB.prepare(
        'SELECT challenge, user_id AS userId, purpose, expires_at AS expiresAt FROM challenges WHERE challenge=?1 AND purpose=?2',
      )
        .bind(challenge, purpose)
        .first();
      if (!r) return null;
      await DB.prepare('DELETE FROM challenges WHERE challenge=?1')
        .bind(challenge)
        .run();
      if (r.expiresAt < Math.floor(Date.now() / 1000)) return null;
      return r;
    },
  };
}

export function d1UserSessions(DB) {
  return {
    async create({ id, userId, ttlSeconds }) {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
      await DB.prepare(
        'INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?1,?2,?3)',
      )
        .bind(id, userId, expiresAt)
        .run();
    },
    async getUser(token) {
      const r = await DB.prepare(
        `SELECT u.id AS id, u.handle AS handle, u.role AS role, s.expires_at AS expiresAt
         FROM user_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ?1`,
      )
        .bind(token)
        .first();
      if (!r) return null;
      if (r.expiresAt < Math.floor(Date.now() / 1000)) return null;
      return { id: r.id, handle: r.handle, role: r.role || 'user' };
    },
    async destroy(token) {
      await DB.prepare('DELETE FROM user_sessions WHERE id=?1')
        .bind(token)
        .run();
    },
  };
}
