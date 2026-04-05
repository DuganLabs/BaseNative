# @basenative/db

> Fluent SQL query builder with SQLite, PostgreSQL, and Cloudflare D1 adapters.

## Overview

`@basenative/db` is a lightweight query builder that produces safe parameterized SQL without an ORM. All queries use `?` placeholders — never string interpolation. It ships three adapter implementations: `createSqliteAdapter` (uses Node 22.5+ built-in `node:sqlite` or falls back to `better-sqlite3`), `createPostgresAdapter`, and `createD1Adapter` for Cloudflare Workers. Schema migrations are handled via `migrate` and `rollback`.

## Installation

```bash
npm install @basenative/db
```

## Quick Start

```js
import { createSqliteAdapter, select, insert, update, deleteFrom } from '@basenative/db';

const db = await createSqliteAdapter({ filename: './app.db' });

// SELECT
const { sql, params } = select('users')
  .columns('id', 'name', 'email')
  .where('active = ?', 1)
  .orderBy('name')
  .limit(20)
  .build();

const { rows } = await db.query(sql, params);

// INSERT
const q = insert('users').values({ name: 'Alice', email: 'alice@example.com' }).build();
const { lastInsertId } = await db.execute(q.sql, q.params);
```

## API Reference

### select(table)

Starts a `SELECT` query builder for the given table.

**Parameters:**
- `table` — table name string

**Returns:** `SelectBuilder` with chainable methods.

**SelectBuilder methods:**
- `.columns(...cols)` — columns to select; default `['*']`
- `.where(condition, ...params)` — appends a `WHERE` condition with bound parameters
- `.join(table, on)` — `INNER JOIN`
- `.leftJoin(table, on)` — `LEFT JOIN`
- `.orderBy(column, direction)` — `'ASC'` or `'DESC'`
- `.limit(n)` — `LIMIT n`
- `.offset(n)` — `OFFSET n`
- `.build()` — returns `{ sql: string, params: any[] }`

**Example:**
```js
const { sql, params } = select('posts')
  .columns('posts.id', 'posts.title', 'users.name')
  .leftJoin('users', 'posts.user_id = users.id')
  .where('posts.published = ?', true)
  .orderBy('posts.created_at', 'DESC')
  .limit(10)
  .offset(20)
  .build();
```

---

### insert(table)

Starts an `INSERT` query builder.

**Parameters:**
- `table` — table name string

**Returns:** `InsertBuilder` with chainable methods.

**InsertBuilder methods:**
- `.values(data)` — object of column/value pairs
- `.returning(...cols)` — `RETURNING` clause (PostgreSQL/SQLite)
- `.build()` — returns `{ sql: string, params: any[] }`

---

### update(table)

Starts an `UPDATE` query builder.

**Returns:** `UpdateBuilder` with `.set(data)`, `.where(condition, ...params)`, `.build()`.

**Example:**
```js
const q = update('users')
  .set({ name: 'Bob' })
  .where('id = ?', 42)
  .build();

await db.execute(q.sql, q.params);
```

---

### deleteFrom(table)

Starts a `DELETE` query builder.

**Returns:** `DeleteBuilder` with `.where(condition, ...params)`, `.build()`.

---

### raw(sql, params)

Passes a raw SQL string directly with bound parameters.

**Parameters:**
- `sql` — raw SQL string
- `params` — array of parameter values; default `[]`

**Returns:** `{ sql, params }`

---

### createSqliteAdapter(options)

Creates a SQLite adapter. Uses Node 22.5+ built-in `node:sqlite`; falls back to `better-sqlite3`.

**Parameters:**
- `options.filename` — database file path; default `':memory:'`
- `options.readonly` — open in read-only mode; default `false`

**Returns:** `Promise<Adapter>`

**Adapter methods:**
- `adapter.query(sql, params)` — returns `Promise<{ rows: object[] }>`
- `adapter.queryOne(sql, params)` — returns `Promise<object | null>`
- `adapter.execute(sql, params)` — returns `Promise<{ changes: number, lastInsertId: number }>`
- `adapter.transaction(fn)` — runs `fn(adapter)` inside a transaction; rolls back on error
- `adapter.close()` — closes the database connection
- `adapter.raw` — the underlying database instance

---

### createPostgresAdapter(options)

Creates a PostgreSQL adapter. Requires a `pg` client instance.

**Parameters:**
- `options.client` — a `pg.Client` or `pg.Pool` instance

**Returns:** Adapter with the same interface as `createSqliteAdapter`.

---

### createD1Adapter(options)

Creates a Cloudflare D1 adapter for use in Workers.

**Parameters:**
- `options.db` — the D1 database binding from the Workers environment

**Returns:** Adapter with the same interface as `createSqliteAdapter`.

---

### migrate(adapter, migrations)

Runs pending migrations in order.

**Parameters:**
- `adapter` — database adapter
- `migrations` — array of `{ version: number, up: string }` objects

---

### rollback(adapter, migrations, steps)

Rolls back the most recent migrations.

**Parameters:**
- `adapter` — database adapter
- `migrations` — array of `{ version: number, down: string }` objects
- `steps` — number of migrations to roll back; default `1`

---

### validateAdapter(adapter)

Throws if the adapter does not implement the required interface (`query`, `queryOne`, `execute`, `transaction`).

## Configuration

No environment configuration required. Pass connection options directly to the adapter factory.

## Integration

Query builders are designed to pair with `@basenative/tenant`. Use `tenantScope` from `@basenative/tenant` to automatically inject `tenant_id` into every query. Use `createDbStore` from `@basenative/auth` for database-backed session storage.

```js
import { createSqliteAdapter, select } from '@basenative/db';
import { migrate } from '@basenative/db';

const db = await createSqliteAdapter({ filename: './app.db' });

await migrate(db, [
  { version: 1, up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
]);
```
