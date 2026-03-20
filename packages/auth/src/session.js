import { randomBytes, createHash } from 'node:crypto';

/**
 * Session manager with pluggable storage.
 */
export function createSessionManager(options = {}) {
  const {
    store = createMemoryStore(),
    cookieName = 'bn_session',
    maxAge = 24 * 60 * 60 * 1000, // 24 hours
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    httpOnly = true,
  } = options;

  function generateId() {
    return randomBytes(32).toString('hex');
  }

  return {
    cookieName,

    async create(data = {}) {
      const id = generateId();
      const session = {
        id,
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + maxAge,
      };
      await store.set(id, session);
      return session;
    },

    async get(id) {
      if (!id) return null;
      const session = await store.get(id);
      if (!session) return null;
      if (Date.now() > session.expiresAt) {
        await store.delete(id);
        return null;
      }
      return session;
    },

    async update(id, data) {
      const session = await store.get(id);
      if (!session) return null;
      session.data = { ...session.data, ...data };
      await store.set(id, session);
      return session;
    },

    async destroy(id) {
      await store.delete(id);
    },

    async touch(id) {
      const session = await store.get(id);
      if (!session) return null;
      session.expiresAt = Date.now() + maxAge;
      await store.set(id, session);
      return session;
    },

    cookieOptions() {
      return {
        httpOnly,
        secure,
        sameSite,
        maxAge: maxAge / 1000,
        path: '/',
      };
    },
  };
}

/**
 * In-memory session store (for development/testing).
 */
export function createMemoryStore() {
  const sessions = new Map();
  return {
    async get(id) { return sessions.get(id) ?? null; },
    async set(id, session) { sessions.set(id, session); },
    async delete(id) { sessions.delete(id); },
    async clear() { sessions.clear(); },
    get size() { return sessions.size; },
  };
}

/**
 * Database-backed session store.
 */
export function createDbStore(adapter, options = {}) {
  const { tableName = 'sessions' } = options;

  return {
    async get(id) {
      const row = await adapter.queryOne(
        `SELECT data, expires_at FROM ${tableName} WHERE id = ?`, [id]
      );
      if (!row) return null;
      return {
        id,
        data: JSON.parse(row.data),
        expiresAt: new Date(row.expires_at).getTime(),
      };
    },

    async set(id, session) {
      const data = JSON.stringify(session.data);
      const expiresAt = new Date(session.expiresAt).toISOString();
      await adapter.execute(
        `INSERT OR REPLACE INTO ${tableName} (id, data, expires_at) VALUES (?, ?, ?)`,
        [id, data, expiresAt]
      );
    },

    async delete(id) {
      await adapter.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    },

    async clear() {
      await adapter.execute(`DELETE FROM ${tableName}`);
    },
  };
}
