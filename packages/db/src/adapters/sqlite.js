/**
 * SQLite adapter using Node.js built-in node:sqlite (Node 22.5+).
 * Falls back to better-sqlite3 if available.
 */

export async function createSqliteAdapter(options = {}) {
  const { filename = ':memory:', readonly = false } = options;

  let db;

  // Try Node.js built-in sqlite first (Node 22.5+)
  try {
    const sqlite = await import('node:sqlite');
    db = new sqlite.DatabaseSync(filename, { readOnly: readonly });
    db._builtin = true;
  } catch {
    // Fall back to better-sqlite3
    try {
      const Database = (await import('better-sqlite3')).default;
      db = new Database(filename, { readonly });
      db._builtin = false;
    } catch {
      throw new Error(
        'No SQLite driver found. Use Node 22.5+ (built-in sqlite) or install better-sqlite3.'
      );
    }
  }

  const adapter = {
    async query(sql, params = []) {
      if (db._builtin) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        return { rows };
      }
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return { rows };
    },

    async queryOne(sql, params = []) {
      if (db._builtin) {
        const stmt = db.prepare(sql);
        return stmt.get(...params) ?? null;
      }
      const stmt = db.prepare(sql);
      return stmt.get(...params) ?? null;
    },

    async execute(sql, params = []) {
      if (db._builtin) {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        return { changes: result.changes, lastInsertId: result.lastInsertRowid };
      }
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { changes: result.changes, lastInsertId: result.lastInsertRowid };
    },

    async transaction(fn) {
      if (db._builtin) {
        // node:sqlite doesn't have transaction helper, use manual BEGIN/COMMIT
        db.exec('BEGIN');
        try {
          const result = await fn(adapter);
          db.exec('COMMIT');
          return result;
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }
      }
      const tx = db.transaction(() => fn(adapter));
      return tx();
    },

    async close() {
      db.close();
    },

    get raw() {
      return db;
    },
  };

  return adapter;
}
