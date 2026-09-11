---
"@basenative/hmr": minor
"@basenative/cli": minor
---

New package `@basenative/hmr`, and `bn dev` now uses it.

`bn dev` used to be `node --watch <server.js>`: the server restarted and the browser kept showing the old HTML until you hit refresh by hand. It now starts the dev server on a private internal port and puts an HMR reverse proxy on the port you asked for, so no project needs any wiring.

On a change the browser re-fetches the current URL, parses the HTML the server just rendered, and reconciles it into the live document. Nodes whose content is unchanged are never touched, which is what keeps focus, the caret, typed-but-unsubmitted input, scroll offsets, open `<dialog>`/`<details>`, and signal bindings alive across an edit. A full reload is still the floor and fires whenever a patch cannot be correct — unparseable HTML, a diverged page structure, a changed browser-delivered `.js` — always with a `[bn:hmr]` console line saying which.

CSS changes swap `<link>` hrefs instead of touching the DOM at all. The injected client is a single external same-origin module script, so nothing here needs `'unsafe-inline'` or `'unsafe-eval'`; `src/csp.test.js` enforces that.

Development-only, with no way back in: `NODE_ENV=production` disables every entry point and no flag overrides it, the check runs per request rather than once at construction, and `createHmrProxy()`/`createWatcher()` throw rather than start. `bn dev --no-hmr` and `BN_HMR=off` opt out; if `@basenative/hmr` cannot be loaded or the proxy cannot bind, `bn dev` warns and falls back to exactly its previous behaviour.
