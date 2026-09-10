# @basenative/wrangler-preset

> Pinned Wrangler version + typed wrangler.toml fragment generator. Pin once, every project moves together.

## Overview

`@basenative/wrangler-preset` is the recommended baseline configuration for any DuganLabs Worker or Pages project: a `dependencies.wrangler` pin (currently `^4.129.0`) so every consuming project's Wrangler CLI version moves together, plus a small set of pure functions for building and serializing `wrangler.toml` config as plain JS objects instead of hand-edited TOML. It has no runtime dependency on the Cloudflare API — everything here is local object manipulation and string serialization; nothing makes a network call. The package also ships a `bn-wrangler` CLI binary (`packages/wrangler-preset/src/cli.js`) for command-line use; this reference covers the importable module API only.

The package's `exports` map declares three subpaths — `.`, `./defaults`, and `./toml` — but all three point at the exact same file, `src/index.js`. They are alternate import spellings for readability (`import { defaults } from '@basenative/wrangler-preset/defaults'` reads well at a glance), not three separate modules — every export below is available from any of the three.

## Installation

```bash
npm install @basenative/wrangler-preset
```

## Quick Start

```js
import { defaults, bindings, mergeWrangler, toToml } from '@basenative/wrangler-preset';

const config = mergeWrangler(
  { name: 'my-worker', main: 'src/index.js', ...defaults },
  bindings.d1('DB', 'my-db', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
  bindings.kv('CACHE', 'yyyyyyyyyyyyyyyyyyyyyyyy'),
);

const tomlText = toToml(config);
// write tomlText to wrangler.toml
```

## API Reference

### defaults

Recommended baseline config fragment for any DuganLabs Worker/Pages project, as a frozen object:

```js
{
  compatibility_date: '2025-09-23',
  compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
  pages_build_output_dir: 'dist',
  workers_dev: true,
  send_metrics: false,
}
```

`compatibility_date` is bumped on each release of this package, so consumers pick up fresh Workers runtime semantics by upgrading `@basenative/wrangler-preset` alone rather than editing every project's `wrangler.toml` by hand. Spread it into a base config, or pass it to `mergeWrangler` as the base.

---

### bindings

Frozen object of fragment builder functions. Each returns a plain object shaped like a piece of wrangler config, meant to be combined with a base config via `mergeWrangler`. All four throw a `TypeError` if a required string argument is missing or empty.

#### bindings.d1(name, dbName, dbId)

D1 database binding fragment.

**Parameters:**
- `name` — binding name (the env var the Worker sees)
- `dbName` — D1 database name
- `dbId` — D1 database UUID

**Returns:** `{ d1_databases: [{ binding, database_name, database_id }] }`

---

#### bindings.kv(name, id)

KV namespace binding fragment.

**Parameters:**
- `name` — binding name
- `id` — KV namespace id

**Returns:** `{ kv_namespaces: [{ binding, id }] }`

---

#### bindings.r2(name, bucket)

R2 bucket binding fragment.

**Parameters:**
- `name` — binding name
- `bucket` — R2 bucket name

**Returns:** `{ r2_buckets: [{ binding, bucket_name }] }`

---

#### bindings.do(name, className, scriptName)

Durable Object binding fragment.

**Parameters:**
- `name` — binding name
- `className` — Durable Object class name
- `scriptName` — optional; the foreign script name, omit for an in-script Durable Object

**Returns:** `{ durable_objects: { bindings: [{ name, class_name, script_name? }] } }`

---

### mergeWrangler(base, ...frags)

Merge a base config and any number of fragments (typically from `bindings.*`, or `defaults`) into a single wrangler config object.

**Parameters:**
- `base` — base config object (deep-cloned before merging; not mutated)
- `...frags` — any number of fragment objects; falsy fragments are skipped

**Merge rules:**
- Array-valued keys (`d1_databases`, `kv_namespaces`, `r2_buckets`, etc.) from multiple fragments are concatenated, not overwritten
- Object-valued keys (e.g. `durable_objects.bindings`) are merged deeply by the same rule, recursively
- Scalar fields from later fragments win over earlier ones
- `undefined` values in a later fragment do not clobber an existing value

**Returns:** a new merged config object.

---

### toToml(config)

Serialize a wrangler config object to TOML text.

This is a small inline implementation covering the subset of TOML wrangler actually uses — top-level scalars (string/number/boolean/array of scalars), tables (nested plain objects, emitted as `[path.to.table]`), and arrays of tables (emitted as `[[path.to.array]]`, e.g. `[[d1_databases]]`). It is not a general-purpose TOML serializer; it round-trips well enough for the `mergeWrangler` → `toToml` → `wrangler` flow this package is built for.

**Parameters:**
- `config` — a plain object (throws a `TypeError` otherwise)

**Returns:** `string` — TOML text ending in exactly one trailing newline.

**Example:**
```js
import { toToml } from '@basenative/wrangler-preset';

toToml({ name: 'my-worker', d1_databases: [{ binding: 'DB', database_name: 'my-db', database_id: 'abc' }] });
// name = "my-worker"
//
// [[d1_databases]]
// binding = "DB"
// database_name = "my-db"
// database_id = "abc"
```

## Integration

The typical flow is `mergeWrangler(defaults, ...bindings.*(...))` followed by `toToml(...)`, with the result written to a project's `wrangler.toml` (or a fragment of it) at build/setup time — this is exactly what the `bn-wrangler` CLI binary automates. Because `defaults` is the single source of the pinned `compatibility_date`/`compatibility_flags`, bumping this package's version and re-running that flow is how every DuganLabs Worker/Pages project picks up the same runtime semantics at once.

## License

Apache-2.0
