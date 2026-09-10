# @basenative/fetch

## 0.4.0

### Minor Changes

- 6eda6f0: Add the typed API-client layer GreenPut had been carrying locally in `libs/basenative/fetch` (upstream dogfooding directive):

  - **`createApiClient({ baseUrl, headers?, fetch?, credentials?, timeoutMs?, onRequest?, onResponse?, onUnauthorized?, onError? })`** returns `{ get, post, put, patch, delete, request, resolveUrl }`. Paths and query params resolve against `baseUrl` (a string or a function resolved per request), plain-object bodies are JSON-encoded, JSON responses are parsed, 204 resolves `undefined`, `raw: true` resolves the `Response`. A non-2xx status, an error envelope in a 2xx body, a timeout (`code: 'timeout'`) or a network failure (`code: 'network_error'`) rejects with `ApiError`; a caller's own `AbortSignal` abort is rethrown untouched so `createResource` keeps ignoring cancellations. `onUnauthorized` runs on 401 before `onError`.
  - **`ApiError`** (`status`, `code`, `message`, `field?`, `url`, `body?`, `response?`, `cause?`) and **`isApiError(value)`**.
  - **Envelope helpers** for the `{ data, meta? }` / `{ error: { code, message, field? } }` shape: `isApiResponse(value)`, `isApiErrorEnvelope(value)` and `unwrap(envelope)` (an envelope or a promise for one; throws `ApiError` for an error envelope).
  - **`serializeQuery(params)`** (keys sorted, arrays repeated, `null`/`undefined` skipped) and **`joinUrl(base, path)`**.

  Type declarations cover every new export and are guarded against drift by `types/exports.test.js`. `createResource`, `createMutation`, `createCache` and `fetchJson` are unchanged.

## 0.3.4

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 0.3.3

### Patch Changes

- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 0.3.2

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 0.3.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0

## 0.3.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
