# @basenative/router

> Signal-based client-side router with SSR-aware path matching

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/router
```

## Quick Start

```js
import { createRouter, interceptLinks } from '@basenative/router';

const router = createRouter([
  { path: '/', name: 'home' },
  { path: '/users/:id', name: 'user' },
  { path: '/blog/:slug*', name: 'blog' },
]);

// Read reactive current route
import { effect } from '@basenative/runtime';

effect(() => {
  const route = router.currentRoute();
  console.log(route.name, route.params, route.query);
});

// Navigate programmatically
router.navigate('/users/42');

// Intercept <a> clicks for client-side navigation
interceptLinks(router);
```

## API

### `createRouter(routes, options?)`

Creates a router instance. Returns an object with:

- `currentRoute` — Computed signal with `{ name, path, params, query, matched }`.
- `navigate(to, options?)` — Pushes a new entry to history (`replace: true` to replace instead).
- `back()` — Navigates back in browser history.
- `forward()` — Navigates forward in browser history.

#### Options

- `base` — Path prefix applied to all routes (e.g. `'/app'`).

### `resolveRoute(routes, path)`

Resolves a path against a route list without creating a router instance. Useful for SSR.

### `compilePattern(pattern)`

Compiles a route pattern string into a matcher object. Supports `:param`, `:param*` (wildcard), and exact segments.

### `matchRoute(compiled, path)`

Tests a compiled pattern against a path. Returns a params object on match, `null` on no match.

### `parseQuery(search)` / `buildQuery(params)`

Parse a query string into an object, or serialize an object into a query string.

### `interceptLinks(router, options?)`

Attaches a `click` listener to `document` that intercepts `<a href>` clicks and calls `router.navigate()` instead of triggering a full page load. Respects `target`, `download`, and external links.

## Navigation Guards — `@basenative/router/guards`

Opt-in — `createRouter()` and the router it returns are unaffected unless you wrap it. Import from the `/guards` subpath (also re-exported from the package root):

```js
import { createRouter } from '@basenative/router';
import { withGuards, redirect } from '@basenative/router/guards';

const router = withGuards(createRouter(routes));

router.beforeEach(({ to, from }) => {
  if (to.name === 'dashboard' && !isAuthenticated()) {
    return redirect('/login'); // or: return '/login'; or: return false;
  }
});

router.afterEach(({ to }) => {
  document.title = to.matched?.title ?? 'App';
});

const ok = await router.navigate('/dashboard'); // Promise<boolean>
```

### `withGuards(router)`

Wraps a router instance (from `createRouter()`) and returns a `GuardedRouter` with the same `pathname` / `query` / `currentRoute` / `back()` / `forward()` / `routes`, plus:

- `navigate(to, options?)` — same as the wrapped router's, but returns `Promise<boolean>`: `true` once navigation and all `afterEach` handlers have run, `false` if a guard aborted or redirected it.
- `beforeEach(guard)` — registers a guard, run in registration order against a preview of the destination route before the URL changes. Returns a disposer that unregisters it.
- `afterEach(handler)` — registers a handler invoked (with `{ to, from, options }`) once navigation commits. Returns a disposer.

A guard receives `{ to, from, options }` (`to`/`from` are `ResolvedRoute`s; `from` is `null` on the very first navigation) and may return:

- `undefined` / nothing — let navigation proceed.
- `false` — abort navigation with no redirect.
- a path string, or `{ redirect, replace? }` — abort and redirect to that path.
- throw `redirect(to, replace?)` (or a `RedirectError` directly) — same as above, usable from deep inside a guard.
- throw anything else — propagates and rejects the `navigate()` call; it is not treated as an abort.

Guards run sequentially; the first one that aborts stops the chain — later guards do not run. Starting a new `navigate()` call while a previous one's guards are still running aborts the in-flight call, which then resolves `false`.

### `redirect(to, replace = true)`

Throws a `RedirectError` that `withGuards()`'s guard runner catches and turns into a redirect. Never returns.

### `RedirectError`

The error class `redirect()` throws. Has `to: string` and `replace: boolean` properties; can also be thrown directly with `throw new RedirectError(to, replace)`.

## License

Apache-2.0
