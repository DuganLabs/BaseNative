# @basenative/persist

> Signal-driven local persistence with TTL, conflict resolution, and a server-rehydrate hook for BaseNative apps.

## Overview

`@basenative/persist` provides three composable layers: a flat key/value API with TTL expiry over a pluggable storage adapter, a `persisted()` binding that keeps a signal in sync with a storage key, and `hydrateFromServer()` for the "resume a session across tabs/reloads/devices" pattern (read local cache immediately, then reconcile with an authoritative server fetch).

"Signal-driven" doesn't mean a hard dependency on `@basenative/runtime` — `@basenative/runtime` is listed in `package.json` as an **optional** peer dependency. `persisted()` duck-types its `signal` argument, accepting anything exposing some combination of `.peek()`/`.get()`/`.value` for reads, `.set()`/`.value =` for writes, and `.subscribe(cb)` or `.on('change', cb)` for change notification — `@basenative/runtime` signals satisfy this out of the box, but so do plain refs or custom reactive primitives.

## Installation

```bash
npm install @basenative/persist
# optional — only needed for the persisted() signal binding
npm install @basenative/runtime
```

## Quick Start

```js
import { signal } from '@basenative/runtime';
import { persisted, hydrateFromServer } from '@basenative/persist';

// Bind a signal to storage — hydrated on creation, written on every change.
const draft = signal('');
const dispose = persisted('compose:draft', draft, {
  ttlSeconds: 7 * 24 * 3600,
  debounceMs: 300,
});

// Session resume: paint from local cache immediately, then reconcile with the server.
await hydrateFromServer({
  key: 'session',
  ttlSeconds: 12 * 3600,
  fetch: () => api.getSession(),
  reconcile: (local, server) => server ?? local,
  onResolve: (state, { source }) => {
    if (state) setSession(state);
  },
  onError: (e) => console.warn('session refresh failed:', e),
});
```

## API Reference

Exports available from the package root (`.`).

### setStorageAdapter(a)

Overrides the global storage adapter used by `loadPersisted`/`savePersisted`/`clearPersisted`/`persisted` (e.g. switch to IndexedDB or an in-memory adapter for tests). Pass `null` to reset back to the lazily-computed default (`defaultAdapter()`).

**Parameters:** `a` — a storage adapter (see `./storage`), or `null`.

---

### loadPersisted(key, opts = {})

Reads a key, honoring the TTL envelope. Also transparently reads the legacy t4bs `{...state, savedAt}` shape (treated as a 12-hour TTL from `savedAt` by default). If the stored value has expired, it is evicted (`removeItem`) and `null` is returned. Any error (e.g. malformed JSON) is swallowed and also returns `null`.

**Parameters:**
- `key` — storage key
- `opts.legacyTtlSeconds` — TTL applied when migrating a legacy-shaped value; default `12 * 3600`

**Returns:** `Promise<T|null>`

---

### savePersisted(key, value, ttlSeconds)

Writes a key, wrapping `value` in a TTL envelope. Errors (e.g. `QuotaExceededError`) are swallowed — persistence is treated as best-effort.

**Parameters:**
- `key` — storage key
- `value` — value to persist (JSON-serializable)
- `ttlSeconds` — `0` or `undefined` means no expiry

---

### clearPersisted(key)

Removes a key. Errors are swallowed.

**Parameters:** `key` — storage key.

---

### persistedSavedAt(key)

Reads the saved-at timestamp for a key without deserializing the full payload — useful for staleness checks without paying the cost of parsing large values.

**Parameters:** `key` — storage key.

**Returns:** `Promise<number>` — milliseconds since epoch, or `0` if the key is absent or unreadable.

---

### persisted(key, signal, opts = {})

Bidirectionally binds a signal to a persistence key: hydrates the signal from storage on creation and writes through on every change.

**Parameters:**
- `key` — storage key
- `signal` — a signal-shaped object (see Overview); works with `@basenative/runtime` signals or anything exposing `peek`/`get`/`value`, `set`/`value=`, and `subscribe`/`on('change', ...)`
- `opts.ttlSeconds` — TTL for writes
- `opts.resolve(local, current)` — merge function called once, after the initial async load, to reconcile the persisted value (`local`) with whatever the signal already held (`current`) before hydration; defaults to just using `local`
- `opts.serialize(v)` — transform applied before persisting; default identity
- `opts.deserialize(raw)` — transform applied after loading; default identity
- `opts.debounceMs` — debounce writes by this many ms; `0` (default) writes immediately on every change

**Returns:** `() => void` — a dispose function that stops the subscription and clears any pending debounced write.

---

### hydrateFromServer(args)

Combines a local-cache read, a server fetch, and reconciliation — the "session resume across tabs/reloads/devices" pattern. Order of operations:

1. Read the local persisted value. If present, call `onResolve(local, { source: 'local', local })` immediately so the UI can paint optimistically.
2. Run `fetch()` to get the authoritative value.
3. If `fetch()` throws, call `onError` and return the local value unchanged — no further persistence happens.
4. Otherwise compute `reconciled = reconcile ? reconcile(local, server) : (server ?? local)`, call `onResolve(reconciled, { source: 'server', local })`, and — if `reconciled` isn't `null`/`undefined` — persist it for next time.

Errors thrown by `onResolve` itself are caught and forwarded to `onError`.

**Parameters:**
- `args.key` — storage key
- `args.fetch()` — `Promise<T|null>`, the authoritative fetch
- `args.onResolve(value, { source, local })` — called once per phase that produces a value
- `args.ttlSeconds` — TTL applied when persisting the reconciled result
- `args.reconcile(local, server)` — optional; defaults to server-wins (`server ?? local`)
- `args.onError(err)` — optional error handler for fetch failures or `onResolve` throws

**Returns:** `Promise<T|null>` — the reconciled value (or the local value if the fetch failed).

## TTL (./ttl)

The on-disk envelope shape is `{ v: <value>, t: <savedAtMs>, e: <expiresAtMs|null> }` — kept terse because every byte counts in `localStorage`.

### wrap(value, ttlSeconds, now = Date.now)

Wraps a value in a TTL envelope.

**Parameters:** `value`; `ttlSeconds` — expiry in seconds from now, or falsy for no expiry; `now` — clock override, mainly for tests.

**Returns:** `{ v, t, e }`.

---

### unwrap(envelope, now = Date.now)

Unwraps an envelope, returning `null` if it's expired or malformed.

**Parameters:** `envelope`; `now` — clock override.

**Returns:** the unwrapped value, or `null`.

---

### fromLegacy(legacy, defaultTtlSeconds = 12 * 3600)

Migrates the t4bs-style legacy `{...state, savedAt}` shape into the current `{v, t, e}` envelope, preserving the original "12h from `savedAt`" expiry semantics. If `legacy` already looks like a current envelope (has both `v` and `t`), it's returned unchanged.

**Parameters:** `legacy` — the legacy object; `defaultTtlSeconds` — expiry applied from `savedAt`; default `12 * 3600` (12 hours).

**Returns:** a `{v, t, e}` envelope, or `null` if `legacy` isn't an object.

---

### savedAt(envelope)

Reads the saved-at timestamp from either envelope format (current `t` or legacy `savedAt`).

**Parameters:** `envelope`.

**Returns:** `number` — `0` if missing or invalid.

---

### NO_EXPIRY

Sentinel value (`null`) used in the envelope's `e` field to mean "never expires." Used internally by `wrap`/`fromLegacy`; exported so callers can compare against it explicitly.

## Storage (./storage)

All adapters share the same async surface (`getItem`/`setItem`/`removeItem`/`clear`) regardless of the underlying mechanism, so callers never need to branch on which one is active.

### defaultAdapter(opts = {})

Picks a sensible default adapter for the current environment: `localStorage` if available, otherwise an in-memory `Map`. Used lazily by `loadPersisted`/`savePersisted`/etc. unless overridden via `setStorageAdapter`.

**Parameters:** `opts.preferIndexedDb` — if `true`, prefer `indexedDbAdapter()` (which itself falls back to memory when IndexedDB is unavailable).

**Returns:** a storage adapter.

---

### localStorageAdapter()

A synchronous-`localStorage`-backed adapter, normalized to the package's async interface. All operations are wrapped in `try/catch` (e.g. to swallow `QuotaExceededError`).

**Returns:** a storage adapter, or `null` if `globalThis.localStorage` isn't available.

---

### memoryAdapter()

An in-memory (`Map`-backed) adapter — always available, used for SSR, tests, and Workers.

**Returns:** a storage adapter.

---

### indexedDbAdapter(opts = {})

An IndexedDB-backed adapter for payloads above the ~5MB `localStorage` cap. Falls back to `memoryAdapter()` if IndexedDB isn't available in the current environment.

**Parameters:** `opts.dbName` — default `'bn-persist'`; `opts.store` — object store name, default `'kv'`.

**Returns:** a storage adapter.

## License

Apache-2.0
