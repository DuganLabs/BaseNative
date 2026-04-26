# @basenative/persist

Signal-driven local persistence with TTL, conflict resolution, and a
server-rehydrate hook. Built for the patterns BaseNative apps actually
need:

- **Resume an in-flight session** across reloads, tabs, and devices.
- **Preserve form drafts** without bespoke `useEffect` plumbing.
- **Remember last selection** (active filter, sort order, theme) with TTL
  so it doesn't get stuck forever.

Three layers, each composable on its own.

## Install

```sh
pnpm add @basenative/persist
# Optional — get reactive bindings via signals
pnpm add @basenative/runtime
```

## Layer 1 — flat KV with TTL

```js
import { loadPersisted, savePersisted, clearPersisted } from '@basenative/persist';

await savePersisted('theme', 'dark');                  // forever
await savePersisted('cart',  cart, 60 * 60 * 24);      // 24h TTL
await loadPersisted('cart');                           // null if expired
await clearPersisted('cart');
```

The on-disk envelope is `{ v, t, e }` — value, savedAt-ms,
expiresAt-ms-or-null. Expired entries are evicted on read.

Legacy `{...state, savedAt}` shape (the t4bs convention) is read
transparently with a default 12h expiry — no migration required.

## Layer 2 — signal binding

```js
import { signal } from '@basenative/runtime';
import { persisted } from '@basenative/persist';

const draft = signal('');
const dispose = persisted('compose:draft', draft, {
  ttlSeconds: 7 * 24 * 3600,
  debounceMs: 300,
});
```

The signal is hydrated from storage on mount and written through on every
change. Pass `resolve(local, current)` to merge instead of overwrite.

Works with any signal-shaped object — `@basenative/runtime`, raw refs, or
your own primitive — anything exposing some combination of `.value`,
`.get/.set`, and `.subscribe`.

## Layer 3 — server-rehydrate

The "session resume" pattern from t4bs's `App.jsx`:

```js
import { hydrateFromServer } from '@basenative/persist';

await hydrateFromServer({
  key: 't4bs:session',
  ttlSeconds: 12 * 3600,
  fetch: () => api.getSession(),
  reconcile: (local, server) => server ?? local, // server is authoritative
  onResolve: (state, { source }) => {
    if (state) setSession(state);
    if (source === 'server') setLoading(false);
  },
  onError: (e) => console.warn('session refresh failed:', e),
});
```

Order of operations:

1. Local cache hit → emit immediately (`source: 'local'`) so the UI
   paints without waiting on the network.
2. `fetch()` runs → emit again with the authoritative result
   (`source: 'server'`).
3. Persist the authoritative state.

If the fetch errors, local is left untouched.

## Storage adapters

```js
import { setStorageAdapter, indexedDbAdapter } from '@basenative/persist';

setStorageAdapter(indexedDbAdapter()); // for big payloads
```

- `localStorageAdapter()` — default; ~5MB cap.
- `indexedDbAdapter({ dbName, store })` — opt-in for larger blobs.
- `memoryAdapter()` — SSR / tests / Workers.

## Examples

### Game session resume

```js
const session = signal(null);
persisted('t4bs:session', session, { ttlSeconds: 12 * 3600 });
```

### Form draft

```js
const draft = signal({ title: '', body: '' });
persisted('compose:draft', draft, { debounceMs: 500, ttlSeconds: 7 * 24 * 3600 });
```

### Last selection

```js
const filter = signal('all');
persisted('inbox:filter', filter); // no expiry
```

## Links

- BaseNative monorepo — https://github.com/DuganLabs/basenative
- Issues — https://github.com/DuganLabs/basenative/issues
- Docs — https://github.com/DuganLabs/basenative#readme

## License

Apache-2.0.
