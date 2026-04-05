# BaseNative Starter Template

A minimal, production-ready starting point for BaseNative applications.

## What's included

| File | Purpose |
|------|---------|
| `src/server.js` | Node.js HTTP server with routing |
| `src/pages/*.html` | SSR page templates using `@if`, `@for`, `{{ }}` |
| `public/app.js` | Client-side hydration with signals |
| `public/app.css` | Minimal CSS using cascade layers |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — feature overview |
| `/about` | About — package list, design principles |
| `/counter` | Counter — signal read/write, `@if` conditional |
| `/todos` | Todo list — `@for`, API calls, computed state |

## Getting started

```bash
# 1. Clone / copy this directory
cp -r examples/starter my-app
cd my-app

# 2. Install dependencies
pnpm install

# 3. Start development server (auto-reloads on file change)
pnpm dev

# 4. Open http://localhost:3000
```

## How it works

### Server rendering

Pages are HTML templates processed by `@basenative/server`:

```html
<!-- src/pages/counter.html -->
<output>{{ count }}</output>
<button @click="increment()">+</button>

@if count > 0
  Counting up!
@endif
```

The server renders the initial state:

```js
import { render } from '@basenative/server';

const html = render(template, { count: 0 });
// → <output>0</output><button>+</button><p>Counter is at zero.</p>
```

### Client hydration

`hydrate()` attaches signal-based reactivity to the server-rendered HTML.
No DOM is replaced — only affected nodes are updated on state change:

```js
import { hydrate, signal } from '@basenative/runtime';

hydrate(document.querySelector('main'), {
  count: signal(0),
  increment() { this.count.set(n => n + 1); },
});
```

### Adding a new page

1. Create `src/pages/mypage.html` with template directives
2. Add a handler in `src/server.js`:
   ```js
   function handleMyPage(req, res) {
     const html = render(readPage('mypage.html'), { /* data */ });
     res.writeHead(200, { 'Content-Type': 'text/html' });
     res.end(layout('My Page', html));
   }
   ```
3. Register the route:
   ```js
   { method: 'GET', path: '/mypage', handler: handleMyPage },
   ```
4. Add client hydration in `public/app.js` if needed

## Next steps

- **Auth**: Add `@basenative/auth` for sessions and RBAC
- **Database**: Add `@basenative/db` for SQLite or PostgreSQL
- **Forms**: Add `@basenative/forms` for validated form state
- **Real-time**: Add `@basenative/realtime` for SSE/WebSocket
- **Multi-tenancy**: See the [multi-tenant SaaS guide](../../docs/guides/multitenant-saas.md)

## License

Apache-2.0
