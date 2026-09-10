# @basenative/router

## 0.5.0

### Minor Changes

- 4e94e12: Added navigation guards as an opt-in wrapper around `createRouter()`: `withGuards(router)` returns a router whose `navigate()` returns `Promise<boolean>` and adds `beforeEach(guard)` / `afterEach(handler)`. A guard can abort navigation (return `false`), redirect it (return a path string, `{ redirect, replace? }`, or throw via the new `redirect(to, replace?)` helper / `RedirectError`), or let it proceed. Guards run sequentially against a preview of the destination route and stop at the first abort; starting a new navigation aborts one still running guards. Available from the package root and from the new `@basenative/router/guards` subpath, both typed. `createRouter()`'s own return value is unchanged.

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 0.4.4

### Patch Changes

- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 0.4.3

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 0.4.2

### Patch Changes

- ce9ff49: Fix broken published-package imports and types resolution.

  - `@basenative/runtime`: move `src/shared/expression.js` inside the package and update internal imports from `../../../src/shared/expression.js` to `./shared/expression.js`. Add `./shared/expression` subpath export so server can consume it. Add `types` conditional to the main export.
  - `@basenative/server`: switch `render.js` to import `evaluateExpression` from `@basenative/runtime/shared/expression`. Add `@basenative/runtime` as a workspace dependency. Add `types` conditional to exports.
  - `@basenative/router`: add `types` conditional to exports so TypeScript with `moduleResolution: "bundler"` resolves the bundled `types/index.d.ts`.

  Closes DuganLabs/basenative#54, #55, #56.

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0

## 0.4.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
