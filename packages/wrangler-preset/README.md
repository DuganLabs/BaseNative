# @basenative/wrangler-preset

> Pin once, every project moves together.

A pinned [Wrangler](https://developers.cloudflare.com/workers/wrangler/) version plus a small, dependency-free fragment generator for `wrangler.toml`. Designed to keep every DuganLabs repo (`basenative`, `duganlabs`, `greenput`, `pendingbusiness`, `ralph-station`, `t4bs`, `warren-sys`, `warrendugan`) on the same Wrangler at the same time.

## Why this exists

Across the org, projects had Wrangler versions ranging from `^3.114` to `^4.85`. Drift caused:

- Inconsistent `compatibility_date` semantics.
- Different defaults for `nodejs_compat` and friends.
- Each repo re-deciding how to wire D1 / KV / R2.
- Wrangler upgrade pain spread out over weeks.

This package pins one Wrangler version, exposes one set of recommended flags, and ships a tiny, typed builder so configs look the same in every repo.

## Install

```bash
pnpm add @basenative/wrangler-preset
# wrangler is pulled in transitively at the version this preset pins.
```

You no longer need a direct `wrangler` dependency in your repo. Use `bn-wrangler` (or `pnpm exec bn-wrangler`) and you'll always get the pinned version.

## CLI

```bash
# Pinned wrangler — pass through any wrangler args:
bn-wrangler --version
bn-wrangler pages dev dist
bn-wrangler deploy
bn-wrangler d1 migrations apply DB --remote

# Preset diagnostics:
bn-wrangler --bn-version
bn-wrangler --bn-help
```

## Programmatic API

### `defaults`

Recommended baseline. Spread it into your config:

```js
import { defaults, mergeWrangler, toToml } from '@basenative/wrangler-preset';

const config = mergeWrangler(
  { name: 'my-app', main: 'src/index.js' },
  defaults,
);

console.log(toToml(config));
```

### `bindings.d1(name, dbName, dbId)` / `kv(name, id)` / `r2(name, bucket)` / `do(name, className, scriptName?)`

Each returns a small fragment object you can `mergeWrangler(...)` into a config:

```js
import { defaults, bindings, mergeWrangler, toToml } from '@basenative/wrangler-preset';

const cfg = mergeWrangler(
  { name: 'my-app', main: 'src/index.js' },
  defaults,
  bindings.d1('DB', 'my-app-db', '<uuid>'),
  bindings.kv('CACHE', '<kv-id>'),
  bindings.r2('ASSETS', 'my-app-assets'),
  bindings.do('ROOM', 'Room'),
);

await fs.writeFile('wrangler.toml', toToml(cfg));
```

### `mergeWrangler(base, ...frags)`

Deep-merges scalars (later wins) and concatenates array-of-tables (`d1_databases`, `kv_namespaces`, `r2_buckets`, `durable_objects.bindings`).

### `toToml(config)`

Zero-dependency TOML serializer covering the subset Wrangler uses: scalars, arrays of scalars, tables, and arrays of tables.

## Generate from the template

```bash
cp node_modules/@basenative/wrangler-preset/templates/wrangler.toml.tmpl wrangler.toml
# then edit __PROJECT_NAME__ etc.
```

## Adoption checklist (per repo)

1. Remove any direct `wrangler` dep from the repo's `package.json`.
2. `pnpm add @basenative/wrangler-preset`.
3. Replace direct `wrangler ...` calls in scripts with `bn-wrangler ...`.
4. Set `compatibility_date` from `defaults.compatibility_date` (or copy the template).
5. Bump everyone together by upgrading this package: one PR per quarter, not eight.

## License

Apache-2.0
