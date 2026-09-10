# @basenative/middleware

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
