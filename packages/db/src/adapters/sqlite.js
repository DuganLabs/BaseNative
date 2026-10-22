/**
 * SQLite adapter using Node.js built-in node:sqlite (Node 22.5+).
 * Falls back to better-sqlite3 only when that package's engines field
 * allows this Node and a child process can open a database with it.
 *
 * better-sqlite3@13 declares `"engines": { "node": ">=22" }`. On Node 20
 * the module import succeeds, then `new Database()` SIGSEGV's. The signal
 * cannot be caught, and it killed packages/db/src/db.test.js in CI runs
 * 39805077689 and 39806233360. An import-only probe reported success and
 * the parent still crashed on construct. Refuse the addon before loading
 * it when engines exclude this process.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

function nodeAtLeast(major, minor) {
  const [maj, min] = process.versions.node.split('.').map(Number);
  return maj > major || (maj === major && (min || 0) >= minor);
}

/** @returns {'allow' | 'deny' | 'unknown'} */
function enginesDecision(range) {
  if (!range || range === '*') return 'allow';
  const [maj, min = 0, pat = 0] = process.versions.node.split('.').map(Number);
  const current = [maj, min, pat];
  const parts = range.split('||').map((part) => part.trim());
  const parsed = parts.map((part) => part.match(/^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/));
  if (parsed.some((match) => !match)) return 'unknown';
  const ok = parsed.some((match) => {
    const need = [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
    for (let i = 0; i < 3; i++) {
      if (current[i] > need[i]) return true;
      if (current[i] < need[i]) return false;
    }
    return true;
  });
  return ok ? 'allow' : 'deny';
}

function betterSqliteLoads() {
  let resolved;
  try {
    resolved = require.resolve('better-sqlite3');
  } catch {
    return { ok: false, reason: 'not installed' };
  }

  let engines;
  try {
    engines = require(require.resolve('better-sqlite3/package.json')).engines?.node || '';
  } catch {
    engines = '';
  }
  const decision = enginesDecision(engines);
  if (decision === 'deny') {
    return {
      ok: false,
      reason:
        `better-sqlite3 engines "${engines}" excludes Node ${process.versions.node}. ` +
        "Constructing that addon SIGSEGV'd CI (runs 39805077689, 39806233360). " +
        'Use Node 22.5+ for the built-in driver.',
    };
  }

  const href = JSON.stringify(pathToFileURL(resolved).href);
  const script = `
    const Database = (await import(${href})).default;
    const db = new Database(':memory:');
    db.prepare('select 1 as n').get();
    db.close();
  `;
  const probe = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    timeout: 15000,
    encoding: 'utf8',
  });
  if (probe.status === 0 && !probe.signal) return { ok: true, reason: '' };
  const reason = probe.signal ? `signal ${probe.signal}` : `exit ${probe.status}`;
  return { ok: false, reason: `child probe ${reason}` };
}

export async function createSqliteAdapter(options = {}) {
  const { filename = ':memory:', readonly = false } = options;

  let db;

  // node:sqlite is not a Node 20 builtin. Importing the name there throws;
  // skip it so this process never mixes a failed builtin load with the addon.
  if (nodeAtLeast(22, 5)) {
    try {
      const sqlite = await import('node:sqlite');
      db = new sqlite.DatabaseSync(filename, { readOnly: readonly });
      db._builtin = true;
    } catch {
      db = null;
    }
  }

  if (!db) {
    const probe = betterSqliteLoads();
    if (!probe.ok) {
      throw new Error(`No SQLite driver found. ${probe.reason}`);
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
