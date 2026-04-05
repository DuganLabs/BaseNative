# @basenative/db

> Fluent SQL query builder with SQLite, PostgreSQL, and Cloudflare D1 adapters

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/db
```

Optional adapter dependencies (install only what you need):

```bash
npm install better-sqlite3   # SQLite
npm install pg               # PostgreSQL
```

## Quick Start

```js
import { select, insert, update, deleteFrom, createSqliteAdapter } from '@basenative/db';

const db = createSqliteAdapter({ filename: './data.db' });

// SELECT
const { sql, params } = select('users')
  .columns('id', 'name', 'email')
  .where('active = ?', true)
  .orderBy('name')
  .limit(20)
  .build();

const users = await db.query(sql, params);

// INSERT
const q = insert('users').values({ name: 'Alice', email: 'alice@example.com' }).build();
await db.run(q.sql, q.params);

// UPDATE
const u = update('users').set({ name: 'Alicia' }).where('id = ?', 1).build();
await db.run(u.sql, u.params);

// DELETE
const d = deleteFrom('users').where('id = ?', 1).build();
await db.run(d.sql, d.params);
```

## API

### Query Builders

All builders produce `{ sql, params }` via `.build()`. All values go through `?` placeholders — no string interpolation.

- `select(table)` — Fluent SELECT builder.
  - `.columns(...cols)` — Columns to select (default `*`).
  - `.where(condition, ...params)` — Adds a WHERE clause (chained with AND).
  - `.join(table, on)` / `.leftJoin(table, on)` — Adds a JOIN clause.
  - `.orderBy(column, direction?)` — Adds ORDER BY.
  - `.limit(n)` / `.offset(n)` — Adds LIMIT/OFFSET.
- `insert(table)` — Fluent INSERT builder.
  - `.values(object)` — Sets column/value pairs.
- `update(table)` — Fluent UPDATE builder.
  - `.set(object)` — Sets column/value pairs.
  - `.where(condition, ...params)` — Adds a WHERE clause.
- `deleteFrom(table)` — Fluent DELETE builder.
  - `.where(condition, ...params)` — Adds a WHERE clause.
- `raw(sql, params?)` — Escape hatch for arbitrary SQL with explicit params.

### Adapters

- `createSqliteAdapter(options)` — SQLite adapter using `better-sqlite3`. Options: `filename`.
- `createPostgresAdapter(options)` — PostgreSQL adapter using `pg`. Options: connection config.
- `createD1Adapter(binding)` — Cloudflare D1 adapter. Pass the D1 binding from `env.DB`.
- `validateAdapter(adapter)` — Validates that an adapter implements the required interface.

### Migrations

- `migrate(db, options)` — Runs pending migrations.
- `rollback(db, options)` — Rolls back the last applied migration batch.

## License

MIT
