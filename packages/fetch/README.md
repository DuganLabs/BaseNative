# @basenative/fetch

> Signal-based async resource fetching with caching, mutations, request deduplication, and a typed API client

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

## API client

```js
import { createApiClient, isApiError, unwrap } from '@basenative/fetch';

const api = createApiClient({
  baseUrl: 'https://api.example.com',
  headers: { 'x-app': 'demo' },
  timeoutMs: 10_000,
  onUnauthorized: () => location.assign('/login'),
});

// Bodies are JSON-encoded, responses JSON-parsed; the envelope comes back as is
const page = await api.get('/api/leads', { page: 2, status: ['new', 'open'] });
page.data; // Lead[]
page.meta; // { total, page, perPage }

// unwrap() when you only need `data`
const lead = await unwrap(api.post('/api/leads', { firstName: 'Jane' }));

try {
  await api.delete(`/api/leads/${lead.id}`);
} catch (err) {
  if (isApiError(err)) console.error(err.status, err.code, err.message);
}
```

Every failure — a non-2xx status, an `{ error: { code, message } }` envelope in a 2xx body, a timeout, or a network error — rejects with an `ApiError`. A caller's own `AbortSignal` abort is rethrown untouched, so `createResource(() => api.get(...))` keeps ignoring cancellations.

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

### createApiClient(options)

Creates a typed `fetch` wrapper bound to a base URL. Options:

- `baseUrl` — string, or a function resolved on every request.
- `headers` — headers sent with every request; per-request headers win.
- `fetch` — implementation to use (default: `globalThis.fetch`).
- `credentials` — default credentials mode (default: `'include'`).
- `timeoutMs` — abort requests that take longer; they reject with an `ApiError` whose `code` is `'timeout'`.
- `onRequest(ctx)`, `onResponse(ctx)`, `onUnauthorized(error, ctx)` (401 only, before `onError`), `onError(error, ctx)` — awaited hooks for auth redirects, telemetry and error tracking.

Returns an `ApiClient`:

- `get(path, params?, init?)`, `post(path, body?, init?)`, `put(path, body?, init?)`, `patch(path, body?, init?)`, `delete(path, init?)` — resolve with the parsed response body (`undefined` for 204). `init` accepts `headers`, `signal`, `credentials`, `raw` and (for `delete`) `params`/`body`.
- `request({ path, method?, params?, body?, headers?, signal?, credentials?, raw? })` — the general form; `raw: true` resolves with the `Response` itself.
- `resolveUrl(path, params?)` — the URL a request would hit.

Plain-object bodies are JSON-encoded with `content-type: application/json` unless you set one; `string`, `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer`, typed arrays and streams pass through untouched.

### ApiError / isApiError(value)

Thrown by the client and by `unwrap()`. Fields: `status` (0 when no response was received), `code` (the envelope's `error.code`, else `http_<status>`, `network_error` or `timeout`), `message`, `field` (when the envelope names one), `url`, `body` (the parsed response body) and `response` (the `Response`, body already consumed). `isApiError(value)` is an `instanceof` guard.

### isApiResponse(value) / isApiErrorEnvelope(value) / unwrap(envelope)

Helpers for the response envelope — `{ data, meta? }` on success, `{ error: { code, message, field? } }` on failure. `unwrap(envelope)` returns `data` from an envelope or from a promise resolving to one, and throws `ApiError` if it is an error envelope.

### serializeQuery(params) / joinUrl(base, path)

`serializeQuery({ b: 1, a: ['x', 'y'], c: null })` → `?a=x&a=y&b=1` — keys sorted (stable cache keys), arrays repeated, `null`/`undefined` skipped, empty string when nothing survives. `joinUrl(base, path)` joins with exactly one `/`; an empty base returns `path`, an absolute `http(s)://` path is returned as is.

## License

Apache-2.0
