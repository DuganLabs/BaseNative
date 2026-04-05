# @basenative/fetch

> Signal-based async data fetching with caching and mutation support.

## Overview

`@basenative/fetch` wraps async data fetching in reactive signals from `@basenative/runtime`. A `createResource` call automatically fetches data and exposes `data`, `loading`, `error`, and `status` signals that drive UI reactivity. `createMutation` handles POST/PUT/DELETE operations with the same signal shape. `createCache` provides a TTL-based in-memory cache for deduplication. `fetchJson` is a thin helper over `globalThis.fetch` with JSON serialization and error wrapping.

## Installation

```bash
npm install @basenative/fetch
```

## Quick Start

```js
import { createResource, createMutation, fetchJson } from '@basenative/fetch';
import { effect } from '@basenative/runtime';

const users = createResource(() => fetchJson('/api/users'));

effect(() => {
  if (users.loading()) console.log('Loading...');
  if (users.error()) console.error(users.error().message);
  if (users.data()) console.log('Users:', users.data());
});

// Refresh after an action
await users.refetch();
```

## API Reference

### createResource(fetcher, options)

Creates a signal-based async resource that fetches and exposes reactive state.

**Parameters:**
- `fetcher` — async function `(params, { signal }) => data`; receives an `AbortSignal` for cancellation
- `options.initialData` — value for the `data` signal before the first fetch; default `null`
- `options.immediate` — whether to fetch immediately on creation; default `true`
- `options.key` — optional cache key string

**Returns:** Object with:
- `data` — signal containing the fetched value (or `initialData`)
- `loading` — signal `boolean`
- `error` — signal `Error | null`
- `status` — computed signal: `'idle' | 'loading' | 'success' | 'error'`
- `fetch(params)` — trigger a new fetch; aborts any in-flight request first
- `refetch(params)` — alias for `fetch`
- `mutate(valueOrFn)` — update `data` optimistically without a network call

**Example:**
```js
const post = createResource(
  ({ id }) => fetchJson(`/api/posts/${id}`),
  { immediate: false }
);

await post.fetch({ id: 42 });
console.log(post.data()); // post object

// Optimistic update
post.mutate(prev => ({ ...prev, title: 'Updated' }));
```

---

### createMutation(mutationFn, options)

Creates a signal-based mutation for write operations.

**Parameters:**
- `mutationFn` — async function `(params) => result`
- `options.onSuccess(result, params)` — called after a successful mutation
- `options.onError(error, params)` — called after a failed mutation

**Returns:** Object with:
- `data` — signal with the mutation result
- `loading` — signal `boolean`
- `error` — signal `Error | null`
- `status` — computed signal: `'idle' | 'loading' | 'success' | 'error'`
- `mutate(params)` — execute the mutation
- `reset()` — reset all signals to their initial state

**Example:**
```js
const createUser = createMutation(
  (data) => fetchJson('/api/users', { method: 'POST', body: data }),
  {
    onSuccess: (user) => {
      console.log('Created user:', user.id);
      userList.refetch();
    },
  }
);

await createUser.mutate({ name: 'Alice', email: 'alice@example.com' });
```

---

### createCache(options)

Creates a TTL-based in-memory request cache for deduplication.

**Parameters:**
- `options.maxAge` — entry TTL in ms; default `300000` (5 minutes)
- `options.maxSize` — maximum number of entries; oldest is evicted when full; default `100`

**Returns:** Object with:
- `cache.get(key)` — returns cached data or `undefined` if expired/absent
- `cache.set(key, data)` — stores data with TTL
- `cache.invalidate(key?)` — invalidates a specific key or clears all entries
- `cache.has(key)` — returns `true` if entry exists and is not expired
- `cache.size` — number of live entries

**Example:**
```js
const cache = createCache({ maxAge: 60_000 });

async function getUser(id) {
  const key = `user:${id}`;
  if (cache.has(key)) return cache.get(key);
  const user = await fetchJson(`/api/users/${id}`);
  cache.set(key, user);
  return user;
}
```

---

### fetchJson(url, options)

Thin `fetch` wrapper that serializes request bodies as JSON and parses responses as JSON.

**Parameters:**
- `url` — request URL string
- `options` — standard `fetch` options; `options.body` is passed through `JSON.stringify`
- `options.headers` — merged with `{ 'Content-Type': 'application/json' }`

**Returns:** `Promise<any>` — parsed JSON response body.

**Throws:** `Error` with `.status` and `.response` properties if the response is not `ok`.

**Example:**
```js
// GET
const users = await fetchJson('/api/users');

// POST
const created = await fetchJson('/api/posts', {
  method: 'POST',
  body: { title: 'Hello', content: 'World' },
});
```

## Integration

`createResource` and `createMutation` use `signal`, `computed`, and `effect` from `@basenative/runtime`. The signals integrate directly with `@basenative/server` hydration markers, so server-rendered resource states are preserved on the client without a full re-fetch.
