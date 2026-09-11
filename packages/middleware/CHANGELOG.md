# @basenative/middleware

## 0.4.0

### Minor Changes

- 4d5cb6d: **Security headers: one hardened baseline instead of eight diverging copies.**

  Five products had each hand-written the same response-hardening finalizer — eight
  sites in all — and every one had drifted from the others. The divergences were not
  preferences:

  - **t4bs ships no HSTS, no CSP and no COOP at all.** Four headers where its
    siblings set eight, and nothing anywhere said so.
  - **Only PendingBusiness has a per-response CSP nonce**, so the other seven still
    send `script-src 'unsafe-inline'` purely to let Cloudflare's edge-injected
    beacon run.
  - **GreenPut's API still sends `bluetooth=()`**, which PendingBusiness removed
    after it logged an "Unrecognized feature" warning on every request. Nothing
    carried that fix sideways.
  - **DuganLabs' CSP has no `frame-ancestors`, `base-uri` or `form-action`**;
    warrendugan's has no `object-src`.

  `securityHeaders(options)` returns a `(response, context?) => Response` finalizer —
  the shape seven of the eight call sites already have — over a deny-by-default
  baseline: `default-src`/`script-src`/`style-src`/`connect-src`/`font-src` at
  `'self'`, `object-src` and `frame-ancestors` at `'none'`, `style-src-attr 'none'`,
  `img-src 'self' data:`, `base-uri`/`form-action` at `'self'`,
  `upgrade-insecure-requests`, one-year HSTS with `includeSubDomains`,
  `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`,
  `Cross-Origin-Opener-Policy: same-origin`, and the five high-risk browser features
  denied.

  **Product policy merges into the baseline; it never replaces it.** A caller's CSP
  source list is unioned with the baseline's and deduplicated, so adding a CDN to
  `script-src` cannot drop `frame-ancestors 'none'` on the way past. Losing a
  baseline protection requires naming it: `csp: { 'upgrade-insecure-requests': null }`.
  Permissions-Policy is the deliberate exception — unioning a deny with an allow is
  meaningless, so `permissions: { camera: ['self'] }` replaces that one feature's
  allow-list and leaves every other denial standing.

  `csp: false`, `hsts: false`, `coop: false` and `frameOptions: false` are all
  supported, so a product that has never had a CSP can adopt the package for the
  other headers today and write its policy later, rather than having one imposed on
  it by an upgrade.

  Alongside the finalizer:

  - `buildSecurityHeaders(options, context?)` returns the header set as a plain
    record, for SSR handlers that need headers before the response exists or whose
    policy varies per request (a per-tenant `camera` allow-list, a preview-only
    CORP).
  - `securityHeadersMiddleware(options)` is the same headers as a `createPipeline()`
    stage. It runs downstream first so `cache` sees the content type the handler
    chose, and publishes the nonce on `ctx.state.cspNonce`.
  - `createNonce()` for the case where the body carries the nonce the header
    declares. Passing a nonce without `nonce: true` **throws** — dropping it
    silently blocks the inline script in production with nothing failing locally.
  - `DEFAULT_CSP` and `DEFAULT_PERMISSIONS`, frozen, for inspection.

  Four classes of mistake are now rejected at construction rather than in a browser:
  `hsts.preload` without `includeSubDomains` or with a short `max-age` (the preload
  list rejects both, so the directive would claim eligibility it does not have); an
  unregistered Permissions-Policy feature name; a CSP source containing `;`, which
  would inject a second directive; and an unknown option key, because a typo there
  silently drops a header.

  `X-Content-Type-Options: nosniff` is unconditional — there is no response it is
  wrong for. `Cross-Origin-Resource-Policy` and `Cross-Origin-Embedder-Policy` are
  omitted by default: `same-origin` breaks any product serving assets to a sibling
  subdomain, and that belongs in a deliberate decision rather than in an upgrade.
  `hsts.preload` is opt-in for the same reason — it is a submission to a
  browser-vendor list that is slow and painful to leave.

  Purely additive. No existing export changes.

## 0.3.4

### Patch Changes

- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

## 0.3.3

### Patch Changes

- bc2e466: The Express adapter's cookie parser now only accepts RFC 6265 token characters in cookie names; names containing separators, spaces or control characters are dropped instead of becoming properties.

## 0.3.2

### Patch Changes

- 9bd4c1b: Fix CodeQL `js/remote-property-injection` (alert #34) by adding an explicit `__proto__`/`constructor`/`prototype` guard before writing parsed cookie names in the Express adapter's `parseCookieHeader`, alongside the existing null-prototype object.

## 0.3.1

### Patch Changes

- e2748d8: Fix a prototype-pollution surface (CodeQL `js/remote-property-injection`) in the Express adapter's `Cookie` header parser: cookie names were written onto a plain `{}` object, so a crafted `__proto__` cookie name reached `Object.prototype`. The parsed cookie map is now created with `Object.create(null)`. No change to the shape returned as `ctx.request.cookies`.

## 0.3.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata
