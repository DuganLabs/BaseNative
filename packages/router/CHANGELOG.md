# @basenative/router

## 0.4.2

### Patch Changes

- ce9ff49: Fix broken published-package imports and types resolution.
  - `@basenative/runtime`: move `src/shared/expression.js` inside the package and update internal imports from `../../../src/shared/expression.js` to `./shared/expression.js`. Add `./shared/expression` subpath export so server can consume it. Add `types` conditional to the main export.
  - `@basenative/server`: switch `render.js` to import `evaluateExpression` from `@basenative/runtime/shared/expression`. Add `@basenative/runtime` as a workspace dependency. Add `types` conditional to exports.
  - `@basenative/router`: add `types` conditional to exports so TypeScript with `moduleResolution: "bundler"` resolves the bundled `types/index.d.ts`.

  Closes DuganLabs/basenative#54, #55, #56.

- Updated dependencies [ce9ff49]
  - @basenative/runtime@0.4.2

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
