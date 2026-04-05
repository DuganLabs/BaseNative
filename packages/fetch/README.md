# @basenative/fetch

> Signal-based async resource fetching with caching, mutations, and request deduplication

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/fetch
```

## Quick Start

```js
import { createResource, createMutation, createCache, fetchJson } from '@basenative/fetch';

// Fetch and expose reactive state
const users = createResource(() => fetchJson('/api/users'));

import { effect } from '@basenative/runtime';

effect(() => {
  if (users.loading()) console.log('Loading...');
  if (users.error()) console.error(users.error());
  if (users.data()) console.log(users.data());
});

// Refetch with params
await users.refetch({ page: 2 });

// Optimistic mutation
const createUser = createMutation(
  (data) => fetchJson('/api/users', { method: 'POST', body: data }),
  { onSuccess: () => users.refetch() }
);

await createUser.mutate({ name: 'Alice' });
```

## API

### `createResource(fetcher, options?)`

Creates a signal-based async resource that fetches data reactively. Options:

- `initialData` — Value for `data` before the first fetch.
- `immediate` — Whether to fetch immediately on creation (default: `true`).
- `key` — Cache key string for deduplication.

Returns: `{ data, loading, error, status, fetch, refetch, mutate }` — all reactive signals plus imperative methods.

- `status` — Computed signal: `'idle'`, `'loading'`, `'success'`, or `'error'`.
- `fetch(params?)` — Triggers a new fetch, aborting any in-flight request.
- `refetch(params?)` — Alias for `fetch`.
- `mutate(value)` — Directly updates `data` without re-fetching. Accepts a value or an updater function.

### `createMutation(mutationFn, options?)`

Creates a signal-based mutation for write operations. Options: `onSuccess(result, params)`, `onError(err, params)`.

Returns: `{ data, loading, error, status, mutate, reset }`.

- `mutate(params)` — Executes the mutation function.
- `reset()` — Clears data, error, and sets status back to `'idle'`.

### `createCache(options?)`

Creates a request cache for deduplication. Options: `maxAge` (default: 5 minutes), `maxSize` (default: 100 entries).

Returns: `{ get(key), set(key, data), invalidate(key?), has(key), size }`.

### `fetchJson(url, options?)`

A fetch wrapper that serializes the request body as JSON, sets `Content-Type: application/json`, and throws a typed `Error` with `.status` and `.response` on non-2xx responses.

## License

MIT
