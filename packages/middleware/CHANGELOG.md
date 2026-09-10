# @basenative/middleware

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
