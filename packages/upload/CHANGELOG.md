# @basenative/upload

## 0.3.1

### Patch Changes

- e2748d8: Fix a prototype-pollution surface (CodeQL `js/remote-property-injection`) in the built-in multipart parser: header names parsed from the request body were written onto a plain `{}` object, so a crafted `__proto__` header name reached `Object.prototype`. The per-part headers object is now created with `Object.create(null)`. No change to the parsed shape returned to callers.

## 0.3.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata
