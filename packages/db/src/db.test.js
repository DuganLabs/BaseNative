import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { select, insert, update, deleteFrom, raw } from './query.js';
import { validateAdapter } from './adapter.js';
import { migrate, rollback } from './migrate.js';

describe('query builder', () => {
  it('builds simple select', () => {
    const q = select('users').build();
    assert.equal(q.sql, 'SELECT * FROM users');
    assert.deepEqual(q.params, []);
  });

  it('builds select with columns and where', () => {
    const q = select('users')
      .columns('id', 'name', 'email')
      .where('status = ?', 'active')
      .where('role = ?', 'admin')
      .build();
    assert.equal(q.sql, 'SELECT id, name, email FROM users WHERE status = ? AND role = ?');
    assert.deepEqual(q.params, ['active', 'admin']);
  });

  it('builds select with order, limit, offset', () => {
    const q = select('users').orderBy('name', 'ASC').limit(10).offset(20).build();
    assert.equal(q.sql, 'SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 20');
  });

  it('builds select with join', () => {
    const q = select('users')
      .columns('users.name', 'orders.total')
      .join('orders', 'orders.user_id = users.id')
      .build();
    assert.equal(
      q.sql,
      'SELECT users.name, orders.total FROM users JOIN orders ON orders.user_id = users.id',
    );
  });

  it('builds select with left join', () => {
    const q = select('users').leftJoin('profiles', 'profiles.user_id = users.id').build();
    assert.equal(q.sql, 'SELECT * FROM users LEFT JOIN profiles ON profiles.user_id = users.id');
  });

  it('builds insert', () => {
    const q = insert('users')
      .values({ name: 'Alice', email: 'alice@test.com', role: 'admin' })
      .build();
    assert.equal(q.sql, 'INSERT INTO users (name, email, role) VALUES (?, ?, ?)');
    assert.deepEqual(q.params, ['Alice', 'alice@test.com', 'admin']);
  });

  it('builds insert with returning', () => {
    const q = insert('users').values({ name: 'Alice' }).returning('id', 'name').build();
    assert.equal(q.sql, 'INSERT INTO users (name) VALUES (?) RETURNING id, name');
  });

  it('builds update', () => {
    const q = update('users').set({ name: 'Bob', status: 'inactive' }).where('id = ?', 1).build();
    assert.equal(q.sql, 'UPDATE users SET name = ?, status = ? WHERE id = ?');
    assert.deepEqual(q.params, ['Bob', 'inactive', 1]);
  });

  it('builds delete', () => {
    const q = deleteFrom('users').where('id = ?', 42).build();
    assert.equal(q.sql, 'DELETE FROM users WHERE id = ?');
    assert.deepEqual(q.params, [42]);
  });

  it('builds raw query', () => {
    const q = raw('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']);
    assert.equal(q.sql, 'SELECT COUNT(*) as count FROM users WHERE status = ?');
    assert.deepEqual(q.params, ['active']);
  });

  it('raw with no params defaults to empty array', () => {
    const q = raw('SELECT 1');
    assert.deepEqual(q.params, []);
  });

  it('select without where omits WHERE clause', () => {
    const q = select('posts').columns('id', 'title').build();
    assert.equal(q.sql, 'SELECT id, title FROM posts');
    assert.ok(!q.sql.includes('WHERE'));
  });

  it('select with multiple orderBy columns', () => {
    const q = select('posts').orderBy('created_at', 'DESC').orderBy('title', 'ASC').build();
    assert.match(q.sql, /ORDER BY created_at DESC, title ASC/);
  });

  it('update without where updates all rows', () => {
    const q = update('settings').set({ maintenance: true }).build();
    assert.equal(q.sql, 'UPDATE settings SET maintenance = ?');
    assert.deepEqual(q.params, [true]);
  });

  it('delete without where deletes all rows', () => {
    const q = deleteFrom('sessions').build();
    assert.equal(q.sql, 'DELETE FROM sessions');
    assert.deepEqual(q.params, []);
  });

  it('delete with multiple where conditions', () => {
    const q = deleteFrom('logs')
      .where('created_at < ?', '2024-01-01')
      .where('level = ?', 'debug')
      .build();
    assert.match(q.sql, /WHERE created_at < \? AND level = \?/);
    assert.deepEqual(q.params, ['2024-01-01', 'debug']);
  });

  it('insert with single column', () => {
    const q = insert('events').values({ name: 'click' }).build();
    assert.equal(q.sql, 'INSERT INTO events (name) VALUES (?)');
    assert.deepEqual(q.params, ['click']);
  });

  it('parameterized queries prevent SQL injection patterns', () => {
    const injection = "'; DROP TABLE users; --";
    const q = select('users').where('name = ?', injection).build();
    // SQL should use ? placeholder, not inline the value
    assert.ok(!q.sql.includes('DROP'));
    assert.deepEqual(q.params, [injection]);
  });
});

describe('validateAdapter', () => {
  it('accepts valid adapter', () => {
    const adapter = {
      query: () => {},
      queryOne: () => {},
      execute: () => {},
      transaction: () => {},
      close: () => {},
    };
    assert.doesNotThrow(() => validateAdapter(adapter));
  });

  it('rejects adapter missing methods', () => {
    assert.throws(() => validateAdapter({}), /missing required method/);
    assert.throws(() => validateAdapter({ query: () => {} }), /missing required method/);
  });
});

describe('sqlite adapter', () => {
  let adapter;

  it('creates in-memory database', async () => {
    try {
      const { createSqliteAdapter } = await import('./adapters/sqlite.js');
      adapter = await createSqliteAdapter();
      assert.ok(adapter);
    } catch (err) {
      // Skip if no SQLite driver available
      if (err.message.includes('No SQLite driver')) return;
      throw err;
    }
  });

  it('executes DDL and DML', async () => {
    if (!adapter) return;
    await adapter.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    await adapter.execute('INSERT INTO test (name) VALUES (?)', ['Alice']);
    await adapter.execute('INSERT INTO test (name) VALUES (?)', ['Bob']);
    const { rows } = await adapter.query('SELECT * FROM test ORDER BY id');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, 'Alice');
  });

  it('queryOne returns single row', async () => {
    if (!adapter) return;
    const row = await adapter.queryOne('SELECT * FROM test WHERE name = ?', ['Bob']);
    assert.equal(row.name, 'Bob');
  });

  it('queryOne returns null for no match', async () => {
    if (!adapter) return;
    const row = await adapter.queryOne('SELECT * FROM test WHERE name = ?', ['Nobody']);
    assert.equal(row, null);
  });

  it('cleans up', async () => {
    if (!adapter) await adapter?.close();
  });
});

describe('query builder — additional', () => {
  it('select with limit but no offset omits OFFSET', () => {
    const q = select('posts').limit(5).build();
    assert.match(q.sql, /LIMIT 5/);
    assert.ok(!q.sql.includes('OFFSET'));
  });

  it('select with offset but no limit omits LIMIT', () => {
    const q = select('posts').offset(10).build();
    assert.match(q.sql, /OFFSET 10/);
    assert.ok(!q.sql.includes('LIMIT'));
  });

  it('select with multiple where conditions chains with AND', () => {
    const q = select('orders')
      .where('status = ?', 'pending')
      .where('total > ?', 100)
      .where('user_id = ?', 5)
      .build();
    assert.match(q.sql, /WHERE status = \? AND total > \? AND user_id = \?/);
    assert.deepEqual(q.params, ['pending', 100, 5]);
  });

  it('insert returning * lists all columns', () => {
    const q = insert('users').values({ name: 'Eve' }).returning('*').build();
    assert.match(q.sql, /RETURNING \*/);
  });

  it('update chained set calls merge data', () => {
    const q = update('users')
      .set({ status: 'active' })
      .set({ role: 'editor' })
      .where('id = ?', 7)
      .build();
    assert.match(q.sql, /SET status = \?, role = \?/);
    assert.deepEqual(q.params, ['active', 'editor', 7]);
  });

  it('select columns accepts flat array', () => {
    const q = select('items').columns(['id', 'name', 'price']).build();
    assert.match(q.sql, /SELECT id, name, price FROM items/);
  });

  it('insert parameter order matches column order', () => {
    const q = insert('events').values({ a: 1, b: 2, c: 3 }).build();
    assert.deepEqual(q.params, [1, 2, 3]);
  });

  it('select with join and where produces correct SQL', () => {
    const q = select('orders')
      .columns('orders.id', 'users.email')
      .join('users', 'users.id = orders.user_id')
      .where('orders.status = ?', 'paid')
      .build();
    assert.match(q.sql, /JOIN users ON/);
    assert.match(q.sql, /WHERE orders.status = \?/);
    assert.deepEqual(q.params, ['paid']);
  });

  it('raw preserves sql exactly', () => {
    const sql = 'SELECT id, name FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC';
    const q = raw(sql);
    assert.equal(q.sql, sql);
    assert.deepEqual(q.params, []);
  });
});

// ---- migrate ----

describe('migrate', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  function makeAdapter() {
    async function execute() {
      // Minimal in-memory adapter
    }

    async function query(sql) {
      if (sql.includes('SELECT name FROM')) {
        return { rows: [] };
      }
      return { rows: [] };
    }

    async function queryOne() {
      return null;
    }

    async function transaction(fn) {
      const tx = { execute: async () => {}, query: async () => ({ rows: [] }) };
      await fn(tx);
    }

    return { execute, query, queryOne, transaction };
  }

  it('returns applied:0 when no migration files exist', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bn-migrate-'));
    const adapter = makeAdapter();
    const result = await migrate(adapter, tmpDir);
    assert.equal(result.applied, 0);
    assert.equal(result.total, 0);
  });

  it('calls onApply for each new migration file', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bn-migrate-'));
    writeFileSync(join(tmpDir, '001_init.sql'), 'CREATE TABLE users (id INTEGER)');
    writeFileSync(join(tmpDir, '002_add.sql'), 'ALTER TABLE users ADD COLUMN name TEXT');

    const applied = [];
    const adapter = makeAdapter();
    const result = await migrate(adapter, tmpDir, { onApply: (f) => applied.push(f) });
    assert.equal(result.total, 2);
    assert.ok(applied.includes('001_init.sql'));
    assert.ok(applied.includes('002_add.sql'));
  });

  it('ignores non-.sql files in migrations dir', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bn-migrate-'));
    writeFileSync(join(tmpDir, 'readme.md'), '# Migrations');
    writeFileSync(join(tmpDir, '001_init.sql'), 'SELECT 1');

    const adapter = makeAdapter();
    const result = await migrate(adapter, tmpDir);
    assert.equal(result.total, 1);
  });
});

describe('rollback', () => {
  it('returns rolled_back:null when no migrations applied', async () => {
    const adapter = {
      async execute() {},
      async query() {
        return { rows: [] };
      },
      async queryOne() {
        return null;
      },
      async transaction(fn) {
        await fn({ execute: async () => {}, query: async () => ({ rows: [] }) });
      },
    };
    const tmpDir = mkdtempSync(join(tmpdir(), 'bn-rb-'));
    try {
      const result = await rollback(adapter, tmpDir);
      assert.equal(result.rolled_back, null);
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });
});

describe('query builder — more edge cases', () => {
  it('select with no table builds from empty string', () => {
    const q = select('').build();
    assert.ok(typeof q.sql === 'string');
  });

  it('update returns to chained build', () => {
    const q = update('users').set({ name: 'Alice' }).where('id', 1).build();
    assert.match(q.sql, /UPDATE users SET/);
    assert.match(q.sql, /WHERE/);
    assert.ok(q.params.includes('Alice'));
    assert.ok(q.params.includes(1));
  });

  it('deleteFrom builds correct SQL', () => {
    const q = deleteFrom('sessions').where('expired', true).build();
    assert.match(q.sql, /DELETE FROM sessions/);
    assert.match(q.sql, /WHERE/);
    assert.ok(q.params.includes(true));
  });

  it('select builds with no columns defaults to SELECT *', () => {
    const q = select('orders').build();
    assert.match(q.sql, /SELECT \*/);
    assert.match(q.sql, /FROM orders/);
  });
});

describe('validateAdapter — additional', () => {
  it('does not throw for adapter with all required methods plus extras', () => {
    const adapter = {
      execute: () => {},
      query: () => {},
      queryOne: () => {},
      transaction: () => {},
      close: () => {},
      extraMethod: () => {},
    };
    assert.doesNotThrow(() => validateAdapter(adapter));
  });

  it('throws for missing close method', () => {
    const adapter = {
      execute: () => {},
      query: () => {},
      queryOne: () => {},
      transaction: () => {},
    };
    assert.throws(() => validateAdapter(adapter), /close/);
  });
});
