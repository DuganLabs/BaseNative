---
"@basenative/router": minor
---

Added navigation guards as an opt-in wrapper around `createRouter()`: `withGuards(router)` returns a router whose `navigate()` returns `Promise<boolean>` and adds `beforeEach(guard)` / `afterEach(handler)`. A guard can abort navigation (return `false`), redirect it (return a path string, `{ redirect, replace? }`, or throw via the new `redirect(to, replace?)` helper / `RedirectError`), or let it proceed. Guards run sequentially against a preview of the destination route and stop at the first abort; starting a new navigation aborts one still running guards. Available from the package root and from the new `@basenative/router/guards` subpath, both typed. `createRouter()`'s own return value is unchanged.
