import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { select, insert, update, deleteFrom, raw } from './query.js';
import { validateAdapter } from './adapter.js';

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
    const q = select('users')
      .orderBy('name', 'ASC')
      .limit(10)
      .offset(20)
      .build();
    assert.equal(q.sql, 'SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 20');
  });

  it('builds select with join', () => {
    const q = select('users')
      .columns('users.name', 'orders.total')
      .join('orders', 'orders.user_id = users.id')
      .build();
    assert.equal(q.sql, 'SELECT users.name, orders.total FROM users JOIN orders ON orders.user_id = users.id');
  });

  it('builds select with left join', () => {
    const q = select('users')
      .leftJoin('profiles', 'profiles.user_id = users.id')
      .build();
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
    const q = insert('users')
      .values({ name: 'Alice' })
      .returning('id', 'name')
      .build();
    assert.equal(q.sql, 'INSERT INTO users (name) VALUES (?) RETURNING id, name');
  });

  it('builds update', () => {
    const q = update('users')
      .set({ name: 'Bob', status: 'inactive' })
      .where('id = ?', 1)
      .build();
    assert.equal(q.sql, 'UPDATE users SET name = ?, status = ? WHERE id = ?');
    assert.deepEqual(q.params, ['Bob', 'inactive', 1]);
  });

  it('builds delete', () => {
    const q = deleteFrom('users')
      .where('id = ?', 42)
      .build();
    assert.equal(q.sql, 'DELETE FROM users WHERE id = ?');
    assert.deepEqual(q.params, [42]);
  });

  it('builds raw query', () => {
    const q = raw('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']);
    assert.equal(q.sql, 'SELECT COUNT(*) as count FROM users WHERE status = ?');
    assert.deepEqual(q.params, ['active']);
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
