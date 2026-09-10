# @basenative/share

> Native Web Share + clipboard fallback, share-card mint client+server, and OG-redirect landing page generator for BaseNative apps

## Overview

`@basenative/share` covers the full lifecycle of "share this result": a browser client that shares via the Web Share API (falling back to clipboard), a server-side store and POST handler that mints a short id for a share payload, and a GET handler that serves a crawler-friendly landing page at `/s/{id}` carrying per-share Open Graph/Twitter meta so link previews render the right card — while real visitors get redirected onward via JavaScript. The store is D1-shaped (anything exposing `.prepare(sql).bind(...).first()/.run()`), and a ready-to-apply migration is included for it.

The package does not render the share-card image itself. `defineShareCards`/`landingHandler` compose with `@basenative/og-image` (an optional peer dependency) for that: `landingHandler`'s `ogImage` option points at wherever you serve the PNG, and a separate route typically calls `@basenative/og-image`'s `renderPng` to produce it. See the Integration section below.

## Installation

```bash
npm install @basenative/share
# optional — for rendering the actual per-card PNG
npm install @basenative/og-image
```

## Quick Start

Client — mint a share card and hand the URL to the OS share sheet:

```js
import { nativeShare, mintShareCard, composeShareText } from '@basenative/share/client';

const { id, url } = await mintShareCard({ sessionId, category, score, won, grid });

const text = composeShareText(
  '${category} · ${score}pts · ${verdict}',
  { category, score, verdict: won ? 'Solved' : 'Busted' }
);

const result = await nativeShare({ text, url });
// result.status: 'shared' | 'copied' | 'failed'
```

Server — persist the mint and serve the landing page (e.g. Cloudflare Pages Functions):

```js
// functions/api/share-cards.js
import { defineShareCards, mintHandler } from '@basenative/share/server';

export const onRequestPost = async (ctx) => {
  const store = defineShareCards({ db: ctx.env.DB });
  return mintHandler({
    store,
    validate: (b) => (typeof b.category === 'string' && b.category ? true : 'bad-category'),
  })(ctx);
};
```

```js
// functions/s/[id].js
import { defineShareCards, landingHandler } from '@basenative/share/server';

export const onRequestGet = async (ctx) => {
  const store = defineShareCards({ db: ctx.env.DB });
  return landingHandler({
    store,
    ogImage: (_card, { origin, id }) => `${origin}/og/score/${id}.png`,
    buildMeta: (card, { origin, id, ogImage }) => ({
      title: `${card.won ? 'Solved' : 'Busted'} ${card.category} for ${card.score}pts`,
      description: `A ${card.category} result.`,
      imageUrl: ogImage,
      canonicalUrl: `${origin}/s/${id}`,
    }),
  })(ctx);
};
```

Apply `migrations/0001_share_cards.sql` (via `@basenative/share/migrations/0001`) to create the backing table before minting.

## API Reference

## Client (`.` / `./client`)

The default export (`.`) and `./client` resolve to the same file — `import ... from '@basenative/share'` and `import ... from '@basenative/share/client'` are interchangeable.

### nativeShare(payload)

Shares via the Web Share API when available, falls back to the clipboard, otherwise reports failure. Has no server dependency and works from any browser context.

**Parameters:**
- `payload.text` — share text; optional
- `payload.url` — share URL; optional
- `payload.title` — share title; optional (only used by `navigator.share`)
- `payload.files` — `File[]` to share; optional, gated through `navigator.canShare` when supported

**Returns:** `Promise<{ status: 'shared'|'copied'|'failed', error?: Error }>`.

**Behavior:**
1. If `navigator.share` exists and (when files are given) `navigator.canShare` doesn't reject the payload, calls `navigator.share(...)`. A user-cancelled share (`AbortError`) resolves as `'failed'` immediately — it does not fall through to the clipboard, since silently copying after a cancel would surprise the user.
2. Otherwise falls back to `navigator.clipboard.writeText(...)` with `url` appended after `text`.
3. Resolves `'failed'` if neither API is available or usable.

---

### mintShareCard(payload, opts = {})

POSTs a share-card payload to your mint endpoint and returns the minted id and URL.

**Parameters:**
- `payload` — arbitrary JSON-serializable object describing the thing being shared
- `opts.endpoint` — request path; default `'/api/share-cards'`
- `opts.fetch` — `fetch` implementation to use; default `globalThis.fetch`
- `opts.headers` — extra headers merged with `Content-Type: application/json`

**Returns:** `Promise<{ id: string, url: string }>` parsed from the response body.

Throws if no `fetch` is available, or if the response is not `ok` (the thrown `Error` carries a `.status` property with the response's HTTP status).

---

### composeShareText(template, vars = {})

A minimal `${var}` template substitution helper for building share text.

**Parameters:**
- `template` — string containing `${key}` placeholders
- `vars` — object of replacement values

**Returns:** the substituted string. A placeholder whose key is missing from `vars` is left untouched (`${key}` stays literal) rather than being replaced with an empty string — this keeps a malformed template from silently dropping data.

---

## Server (`./server`)

### shortId(len = DEFAULT_ID_LENGTH, alphabet = DEFAULT_ALPHABET)

Generates a cryptographically random short id using `crypto.getRandomValues`.

**Parameters:**
- `len` — id length; default `DEFAULT_ID_LENGTH` (`8`)
- `alphabet` — character set to draw from; default `DEFAULT_ALPHABET`

**Returns:** the generated id string. Throws `RangeError` if the alphabet's length isn't between 1 and 256.

Uses rejection sampling rather than `byte % alphabet.length`: bytes that would land unevenly across the alphabet (when 256 isn't a multiple of the alphabet size) are discarded and redrawn, so every character in the alphabet is equally likely regardless of its length.

---

### defineShareCards(cfg = {})

Defines a share-card store bound to a specific database and table.

**Parameters:**
- `cfg.db` — required; a D1-shaped database exposing `.prepare(sql)`
- `cfg.table` — table name; default `'share_cards'`
- `cfg.idLength` — passed to `shortId`; default `DEFAULT_ID_LENGTH`
- `cfg.alphabet` — passed to `shortId`; default `DEFAULT_ALPHABET`
- `cfg.columns` — known column names to store directly; default `['user_id', 'session_id', 'category', 'score', 'won', 'grid']`
- `cfg.payloadColumn` — column that stores any fields not in `cfg.columns`, as JSON; default `'payload_json'`

**Returns:** a `ShareCardStore`:
- `create(input)` — generates a `shortId`, splits `input` into known columns (matched by camelCase or snake_case key) plus a JSON blob of everything else, inserts a row, and returns `{ id }`
- `get(id)` — selects the row by id, returns `null` if not found, and parses the payload column into a `.payload` field on the returned record

`table`, `columns`, and `payloadColumn` are validated against a plain-identifier pattern before being interpolated into SQL (they can't be passed as `?` bind parameters), so a caller can't smuggle SQL through a config name; all *values* are always bound with `?` placeholders.

---

### mintHandler(opts)

Builds a POST handler for a share-card mint endpoint (e.g. `/api/share-cards`).

**Parameters:**
- `opts.store` — required; a `ShareCardStore` from `defineShareCards`
- `opts.origin` — string or `(env) => string`, used to build the returned `url`; falls back to `env.PUBLIC_ORIGIN`, `env.RP_ORIGIN`, or the request's own origin
- `opts.path` — path prefix for the returned share URL; default `'/s/'`
- `opts.validate` — `(body) => true | string`; return an error-code string to reject the request with `400`
- `opts.onCreated` — `(id, body, { request, env }) => void | Promise<void>`, called after a successful create (errors are swallowed)

**Returns:** an async handler `({ request, env }) => Response`. Responds `405` for non-POST requests, `400` for unparseable JSON or a failed `validate`, and otherwise `{ id, url }` as JSON.

---

### landingHandler(opts)

Builds a GET handler that serves the OG-bearing landing page for a minted share card (e.g. `/s/{id}`).

**Parameters:**
- `opts.store` — required; a `ShareCardStore`
- `opts.buildMeta` — required; `(card, { origin, id, ogImage }) => LandingMeta` (see `buildLandingHtml`)
- `opts.origin` — same resolution as in `mintHandler`
- `opts.ogImage` — string or `(card, { origin, id }) => string`; the image URL passed into `buildMeta`'s context
- `opts.redirectTo` — default redirect target if `buildMeta`'s result doesn't set one; default `'/'`
- `opts.cacheControl` — response `Cache-Control` header; default `'public, max-age=300, s-maxage=300'`
- `opts.idPattern` — `RegExp` validating the `id` route param; default `/^[a-z0-9]{4,16}$/i`

**Returns:** an async handler `({ request, env, params }) => Response`. Responds `400` for an id that fails `idPattern`, `404` if `store.get(id)` returns nothing, and otherwise the HTML from `buildLandingHtml(meta)` with `Content-Type: text/html; charset=utf-8`.

---

### DEFAULT_ALPHABET

The default alphabet used by `shortId`: `'23456789abcdefghjkmnpqrstuvwxyz'` — a Crockford-flavoured base32-like set that excludes `0`/`1`/`i`/`l`/`o` to avoid visually ambiguous ids.

---

### DEFAULT_ID_LENGTH

The default id length used by `shortId`: `8`.

---

## OG Redirect (`./og-redirect`)

`landingHandler` calls `buildLandingHtml` internally, so most consumers won't need to import `./og-redirect` directly — it's exposed for building a custom landing response outside of `landingHandler`.

### buildLandingHtml(meta)

Builds the full HTML document for a share landing page: OG/Twitter meta tags for crawlers, plus a visible fallback body that JS-redirects real visitors to `meta.redirectTo`. The redirect is done with `window.location.replace(...)` rather than `<meta http-equiv="refresh">`, because some crawlers follow a meta-refresh and end up scraping the redirect target instead of the card page.

**Parameters — `meta` (`LandingMeta`):**
- `title` — `<title>`, `og:title`, `twitter:title`
- `description` — description meta, `og:description`, `twitter:description`
- `imageUrl` — `og:image` / `twitter:image` (should be absolute)
- `canonicalUrl` — `og:url` and the rendered `<link rel="canonical">`
- `siteName` — `og:site_name`; default `'BaseNative'`
- `imageAlt` — `og:image:alt`; default `title`
- `themeColor` — `<meta name="theme-color">` and the page background; default `'#0C0B09'`
- `redirectTo` — human-visitor redirect target; default `'/'`
- `bodyHeading` — visible `<h1>`; default `title`
- `bodyTagline` — visible `<p>`; default `description`
- `twitterCard` — `twitter:card` value; default `'summary_large_image'`
- `imageSize` — `{ width?, height? }` for `og:image:width`/`height`; default `1200×630`

**Returns:** an HTML document string.

---

### escHtml(s)

Internal-use HTML escape (`&`, `<`, `>`, `"`, `'`), duplicated locally rather than imported so `og-redirect.js` has no dependencies of its own. Not typically called directly — used internally by `buildLandingHtml` to escape every field before interpolating it into the document.

## Migrations

### `./migrations/0001`

Resolves to `migrations/0001_share_cards.sql`, a plain SQL resource (not a JS module). It creates the `share_cards` table (`id`, `user_id`, `session_id`, `category`, `score`, `won`, `grid`, `payload_json`, `created_at`) that `defineShareCards`'s default `table`/`columns` expect, plus indexes on `user_id`, `session_id`, and `created_at`.

## Integration

`defineShareCards` and `landingHandler` don't render the actual share-card image — that's `@basenative/og-image`'s job, declared as an optional peer dependency. A typical setup adds a third route (e.g. `/og/score/[id].png`) that loads the card via the same `ShareCardStore`, calls `renderPng` from `@basenative/og-image` (with a scene from `@basenative/og-image/presets` or `@basenative/og-image/scene`) to produce the PNG, and points `landingHandler`'s `ogImage` option at that route so the landing page's meta tags reference it.

## License

Apache-2.0
