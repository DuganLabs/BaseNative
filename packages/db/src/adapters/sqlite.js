/**
 * SQLite adapter using Node.js built-in node:sqlite (Node 22.5+).
 * Falls back to better-sqlite3 only after a child process proves the
 * native addon loads. Importing a mismatched better-sqlite3 binary
 * SIGSEGV'd the Node 20 CI job (actions run 39805077689,
 * packages/db/src/db.test.js). A signal cannot be caught in-process,
 * so a failed probe becomes "no driver" instead of aborting the runner.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

function betterSqliteLoads() {
  let resolved;
  try {
    resolved = require.resolve('better-sqlite3');
  } catch {
    return { ok: false, reason: 'not installed' };
  }
  const probe = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(resolved).href)})`],
    { timeout: 15000, encoding: 'utf8' },
  );
  if (probe.status === 0) return { ok: true, reason: '' };
  const reason = probe.signal ? `signal ${probe.signal}` : `exit ${probe.status}`;
  return { ok: false, reason };
}

export async function createSqliteAdapter(options = {}) {
  const { filename = ':memory:', readonly = false } = options;

  let db;

  // Try Node.js built-in sqlite first (Node 22.5+)
  try {
    const sqlite = await import('node:sqlite');
    db = new sqlite.DatabaseSync(filename, { readOnly: readonly });
    db._builtin = true;
  } catch {
    const probe = betterSqliteLoads();
    if (!probe.ok) {
      throw new Error(
        `No SQLite driver found. Use Node 22.5+ (built-in sqlite) or install a better-sqlite3 build that loads in a child process (${probe.reason}).`,
      );
    }
    const Database = (await import('better-sqlite3')).default;
    db = new Database(filename, { readonly });
    db._builtin = false;
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
