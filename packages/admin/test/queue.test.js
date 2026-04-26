// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineQueue } from '../src/queue.js';

/** Tiny in-memory DB shim that implements the prepare/bind/run/all/first
 *  surface that defineQueue depends on. Sufficient for behavioural tests
 *  without dragging in better-sqlite3.
 */
function memDb() {
  const tables = { submissions: [], approved: [] };
  let nextId = 1;
  const exec = (sql, args) => {
    const trimmed = sql.replace(/\s+/g, ' ').trim();
    if (trimmed.startsWith('SELECT * FROM submissions WHERE status = \'pending\'')) {
      return { all: () => ({ results: tables.submissions.filter((r) => r.status === 'pending') }) };
    }
    if (trimmed.startsWith('SELECT * FROM submissions WHERE id = ?')) {
      const id = args[0];
      return { first: () => tables.submissions.find((r) => r.id === id) || null };
    }
    if (trimmed.startsWith('INSERT INTO submissions')) {
      const [submitted_by, status, created_at, category, phrase] = args;
      const row = { id: nextId++, submitted_by, status, created_at, category, phrase };
      tables.submissions.push(row);
      return { run: () => ({ meta: { last_row_id: row.id, changes: 1 } }) };
    }
    if (trimmed.startsWith('UPDATE submissions SET status')) {
      const [status, decided_by, decided_at, id] = args;
      const row = tables.submissions.find((r) => r.id === id && r.status === 'pending');
      if (!row) return { run: () => ({ meta: { changes: 0 } }) };
      row.status = status; row.decided_by = decided_by; row.decided_at = decided_at;
      return { run: () => ({ meta: { changes: 1 } }) };
    }
    if (trimmed.startsWith('INSERT INTO approved')) {
      const [category, phrase, created_at, created_by] = args;
      tables.approved.push({ category, phrase, created_at, created_by });
      return { run: () => ({ meta: { changes: 1 } }) };
    }
    throw new Error(`unhandled SQL: ${trimmed}`);
  };

  return {
    _tables: tables,
    prepare(sql) {
      return {
        bind: (...args) => {
          const r = exec(sql, args);
          return {
            all: async () => r.all ? r.all() : { results: [] },
            first: async () => r.first ? r.first() : null,
            run: async () => r.run ? r.run() : ({ meta: { changes: 0 } }),
          };
        },
      };
    },
  };
}

describe('defineQueue', () => {
  it('submit → listPending → approve → target table', async () => {
    const db = memDb();
    const q = defineQueue({ db, tables: { submissions: 'submissions', target: 'approved' } });

    const s = await q.submit({ category: 'Foods', phrase: 'apple pie', submittedBy: 'alice' });
    assert.equal(s.id, 1);

    const pending = await q.listPending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].category, 'Foods');

    const dec = await q.decide(1, 'approved', 'mod1');
    assert.equal(dec.status, 'approved');
    assert.equal(dec.decidedBy, 'mod1');

    assert.equal(db._tables.approved.length, 1);
    assert.equal(db._tables.approved[0].phrase, 'apple pie');
    assert.equal(db._tables.approved[0].created_by, 'mod1');
  });

  it('reject does not copy to target', async () => {
    const db = memDb();
    const q = defineQueue({ db, tables: { submissions: 'submissions', target: 'approved' } });
    await q.submit({ category: 'X', phrase: 'banned phrase', submittedBy: 'alice' });
    await q.decide(1, 'rejected', 'mod1');
    assert.equal(db._tables.approved.length, 0);
  });

  it('decide on already-decided returns null', async () => {
    const db = memDb();
    const q = defineQueue({ db, tables: { submissions: 'submissions', target: 'approved' } });
    await q.submit({ category: 'X', phrase: 'p', submittedBy: 'a' });
    await q.decide(1, 'approved', 'mod1');
    const r = await q.decide(1, 'rejected', 'mod1');
    assert.equal(r, null);
  });

  it('rejects unsafe table identifiers', () => {
    assert.throws(() => defineQueue({
      db: { prepare: () => ({}) },
      tables: { submissions: 'submissions; DROP', target: 'x' },
    }));
  });

  it('decide rejects bad status', async () => {
    const db = memDb();
    const q = defineQueue({ db, tables: { submissions: 'submissions', target: 'approved' } });
    await q.submit({ category: 'X', phrase: 'p', submittedBy: 'a' });
    await assert.rejects(() => q.decide(1, 'pending', 'mod1'));
    await assert.rejects(() => q.decide(1, 'meh', 'mod1'));
  });
});
