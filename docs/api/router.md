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
