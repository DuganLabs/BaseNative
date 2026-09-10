# @basenative/fetch

> Signal-based async data fetching with caching, mutation support, and a typed API client.

## Overview

`@basenative/fetch` wraps async data fetching in reactive signals from `@basenative/runtime`. A `createResource` call automatically fetches data and exposes `data`, `loading`, `error`, and `status` signals that drive UI reactivity. `createMutation` handles POST/PUT/DELETE operations with the same signal shape. `createCache` provides a TTL-based in-memory cache for deduplication. `fetchJson` is a thin helper over `globalThis.fetch` with JSON serialization and error wrapping. `createApiClient` is the fuller HTTP client: a base URL, default headers, query serialization, JSON bodies, a response envelope (`{ data, meta? }` / `{ error: { code, message, field? } }`), a typed `ApiError`, timeouts and request/response/error hooks.

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

---

### createApiClient(options)

Creates a typed `fetch` wrapper bound to a base URL.

**Parameters:**
- `options.baseUrl` — base URL string, or a function resolved on every request
- `options.headers` — `HeadersInit` sent with every request; per-request headers win
- `options.fetch` — fetch implementation; default `globalThis.fetch`
- `options.credentials` — default `RequestCredentials`; default `'include'`
- `options.timeoutMs` — abort requests that take longer; they reject with an `ApiError` whose `code` is `'timeout'`
- `options.onRequest(ctx)` — awaited before fetch; `ctx` is `{ url, path, method, headers, init }`
- `options.onResponse(ctx)` — awaited after fetch, before status handling; `ctx.response` is the `Response`
- `options.onUnauthorized(error, ctx)` — awaited on a 401 response, before `onError`
- `options.onError(error, ctx)` — awaited before every `ApiError` is thrown

**Returns:** `ApiClient` with:
- `get(path, params?, init?)` — `params` is serialized with `serializeQuery`
- `post(path, body?, init?)`, `put(path, body?, init?)`, `patch(path, body?, init?)`
- `delete(path, init?)`
- `request({ path, method?, params?, body?, headers?, signal?, credentials?, raw? })` — the general form the verbs delegate to
- `resolveUrl(path, params?)` — the URL a request would hit

`init` accepts `headers`, `signal`, `credentials` and `raw` (plus `params` / `body` where the verb does not take them positionally). Every verb resolves with the parsed response body: JSON for `*/json` and `*+json` media types, text for `text/*`, `null` otherwise, `undefined` for 204. `raw: true` resolves with the `Response` itself (non-2xx still throws). Plain-object bodies are JSON-encoded with `content-type: application/json` unless a content type is already set; `string`, `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer`, typed arrays and `ReadableStream` bodies pass through untouched.

**Throws:** `ApiError` for a non-2xx status, for an error envelope in a 2xx body, for a timeout (`code: 'timeout'`, `status: 0`) and for a network failure (`code: 'network_error'`, `status: 0`, `cause` set). An abort from the caller's own `signal` is rethrown untouched (an `AbortError`, not an `ApiError`) and does not run `onError`, so `createResource(() => api.get(...))` keeps ignoring cancellations.

**Example:**
```js
const api = createApiClient({
  baseUrl: () => window.__API_BASE__,
  headers: { 'x-app': 'demo' },
  timeoutMs: 10_000,
  onUnauthorized: () => location.assign('/login'),
  onError: (err, ctx) => telemetry.track('api_error', { code: err.code, path: ctx.path }),
});

const page = await api.get('/api/leads', { page: 2, status: ['new', 'open'] });
page.data; // Lead[]
page.meta; // { total, page, perPage }

const lead = await unwrap(api.post('/api/leads', { firstName: 'Jane' }));
await api.delete(`/api/leads/${lead.id}`);

const csv = await api.request({ path: '/api/leads/export', raw: true });
```

---

### ApiError

Error class thrown by `createApiClient` and by `unwrap()`. `new ApiError(message, { status, code?, field?, url?, body?, response?, cause? })`.

**Fields:**
- `status` — HTTP status, or `0` when no response was received
- `code` — the envelope's `error.code` when present; otherwise `http_<status>`, or `http_network` for status 0. The client uses `'network_error'` and `'timeout'` for its own failures
- `message` — the envelope's `error.message`, a `text/plain` body, the status text, or `HTTP <status>`
- `field` — the envelope's `error.field`, when a form field is named
- `url` — the fully resolved request URL (`''` when constructed without one)
- `body` — the parsed response body, when one was read
- `response` — the `Response`, when one was received; its body is already consumed, read `body` instead
- `cause` — the underlying error for network failures

---

### isApiError(value)

`instanceof` guard for `ApiError`.

**Example:**
```js
try {
  await api.post('/api/leads', form);
} catch (err) {
  if (isApiError(err) && err.field) showFieldError(err.field, err.message);
  else throw err;
}
```

---

### isApiResponse(value)

Returns `true` for a success envelope — an object with a `data` property: `{ data, meta? }`, where `meta` carries pagination as `{ total, page, perPage }`.

---

### isApiErrorEnvelope(value)

Returns `true` for an error envelope — an object whose `error` property is a non-null object: `{ error: { code, message, field? } }`.

---

### unwrap(envelope)

Returns the `data` of a success envelope. Given a promise, returns a promise for the `data` of the envelope it resolves to.

**Throws:** `ApiError` (with `status: 0` and the envelope's `code`/`message`/`field`) when handed an error envelope; `TypeError` for a value that is neither.

**Example:**
```js
const leads = await unwrap(api.get('/api/leads'));   // Lead[]
const stats = unwrap({ data: { total: 3 } });         // { total: 3 }
```

---

### serializeQuery(params)

Serializes a params object to a query string.

**Parameters:**
- `params` — object of `string | number | boolean | null | undefined` values or arrays of them; `null`/`undefined` (the object itself, or a value) is skipped

**Returns:** `?key=value&…` with keys sorted so equal objects always serialize identically, arrays repeated once per element in order, and `encodeURIComponent` applied to keys and values — or `''` when nothing survives.

**Example:**
```js
serializeQuery({ q: 'hello world', tag: ['a', 'b'], page: 1, empty: null });
// '?page=1&q=hello%20world&tag=a&tag=b'
```

---

### joinUrl(base, path)

Joins a base URL and a path with exactly one `/` between them, keeping any base path prefix and any query string already on `path`. An empty `base` returns `path` unchanged; an absolute `http(s)://` path is returned as is.

**Example:**
```js
joinUrl('https://api.example.com/', 'v1/users?x=1'); // 'https://api.example.com/v1/users?x=1'
joinUrl('', '/users');                                // '/users'
```

## Integration

`createApiClient` and its helpers have no dependencies and run anywhere `fetch` does (browsers, Node 20+, Workers); pass `fetch` explicitly to mock it in tests. `createResource` and `createMutation` use `signal`, `computed`, and `effect` from `@basenative/runtime`. The signals integrate directly with `@basenative/server` hydration markers, so server-rendered resource states are preserved on the client without a full re-fetch.
