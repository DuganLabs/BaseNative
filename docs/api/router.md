# @basenative/router API

## `createRouter(routes, options?)`

Creates a client-side router with signal-based reactive state.

```js
import { createRouter } from '@basenative/router';

const router = createRouter([
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user-detail' },
  { path: '/files/*path', name: 'files' },
], { base: '/app' });
```

### Router Instance

| Property/Method | Type | Description |
|----------------|------|-------------|
| `pathname` | `Signal<string>` | Current pathname |
| `query` | `Signal<Record>` | Current query params |
| `currentRoute` | `Signal<ResolvedRoute>` | Current matched route |
| `navigate(to, opts?)` | `function` | Navigate to path |
| `back()` | `function` | Go back in history |
| `forward()` | `function` | Go forward in history |

### Route Patterns

| Pattern | Example | Matches |
|---------|---------|---------|
| `/users` | `/users` | Static path |
| `/users/:id` | `/users/42` | Named param |
| `/files/*path` | `/files/a/b/c` | Wildcard |

## `resolveRoute(routes, url, options?)`

Server-side route resolution without browser APIs.

```js
const match = resolveRoute(routes, '/users/42?tab=posts');
// { name: 'user-detail', params: { id: '42' }, query: { tab: 'posts' } }
```

## `interceptLinks(root, router, options?)`

Intercepts internal link clicks for client-side navigation.

```js
const cleanup = interceptLinks(document.body, router);
```

## Utility Functions

- `compilePattern(path)` — Compile a route pattern to regex
- `matchRoute(pattern, pathname)` — Match a URL against a pattern
- `parseQuery(search)` — Parse query string to object
- `buildQuery(params)` — Build query string from object

## Navigation Guards — `@basenative/router/guards`

Opt-in wrapper around a router instance; `createRouter()` itself is unchanged. Also re-exported from the package root.

```js
import { createRouter } from '@basenative/router';
import { withGuards, redirect } from '@basenative/router/guards';

const router = withGuards(createRouter(routes));

router.beforeEach(({ to }) => {
  if (to.name === 'dashboard' && !isAuthenticated()) return redirect('/login');
});

router.afterEach(({ to }) => {
  document.title = to.matched?.title ?? 'App';
});

const ok = await router.navigate('/dashboard'); // Promise<boolean>
```

### `withGuards(router)`

Returns a `GuardedRouter`: the same `pathname` / `query` / `currentRoute` / `back()` / `forward()` / `routes` as the wrapped router, plus:

| Method | Description |
|---|---|
| `navigate(to, options?)` | Same as the wrapped router's, but returns `Promise<boolean>` — `true` once navigation and every `afterEach` handler have run, `false` if a guard aborted or redirected it. |
| `beforeEach(guard)` | Registers a guard, run in registration order against a preview of the destination before the URL changes. Returns a disposer. |
| `afterEach(handler)` | Registers a handler invoked with `{ to, from, options }` once navigation commits. Returns a disposer. |

A `beforeEach` guard receives `{ to, from, options }` and may return `undefined` (proceed), `false` (abort), a path string or `{ redirect, replace? }` (abort + redirect), or throw `redirect(to, replace?)` for the same. Any other thrown error propagates and rejects the `navigate()` call instead of being treated as an abort. Guards run sequentially and stop at the first abort. A new `navigate()` call aborts a still-running previous one, which then resolves `false`.

### `redirect(to, replace = true)`

Throws a `RedirectError`, caught by `withGuards()`'s guard runner and turned into a redirect. Never returns.

### `RedirectError`

The error class thrown by `redirect()`. Has `to: string` and `replace: boolean`.
