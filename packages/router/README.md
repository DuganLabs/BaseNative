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

## License

MIT
