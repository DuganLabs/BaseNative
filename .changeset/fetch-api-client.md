---
"@basenative/fetch": minor
---

Add the typed API-client layer GreenPut had been carrying locally in `libs/basenative/fetch` (upstream dogfooding directive):

- **`createApiClient({ baseUrl, headers?, fetch?, credentials?, timeoutMs?, onRequest?, onResponse?, onUnauthorized?, onError? })`** returns `{ get, post, put, patch, delete, request, resolveUrl }`. Paths and query params resolve against `baseUrl` (a string or a function resolved per request), plain-object bodies are JSON-encoded, JSON responses are parsed, 204 resolves `undefined`, `raw: true` resolves the `Response`. A non-2xx status, an error envelope in a 2xx body, a timeout (`code: 'timeout'`) or a network failure (`code: 'network_error'`) rejects with `ApiError`; a caller's own `AbortSignal` abort is rethrown untouched so `createResource` keeps ignoring cancellations. `onUnauthorized` runs on 401 before `onError`.
- **`ApiError`** (`status`, `code`, `message`, `field?`, `url`, `body?`, `response?`, `cause?`) and **`isApiError(value)`**.
- **Envelope helpers** for the `{ data, meta? }` / `{ error: { code, message, field? } }` shape: `isApiResponse(value)`, `isApiErrorEnvelope(value)` and `unwrap(envelope)` (an envelope or a promise for one; throws `ApiError` for an error envelope).
- **`serializeQuery(params)`** (keys sorted, arrays repeated, `null`/`undefined` skipped) and **`joinUrl(base, path)`**.

Type declarations cover every new export and are guarded against drift by `types/exports.test.js`. `createResource`, `createMutation`, `createCache` and `fetchJson` are unchanged.
