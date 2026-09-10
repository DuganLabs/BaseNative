# @basenative/forms

## 1.0.0

### Major Changes

- f7e26f4: Realign `@basenative/forms` with the registry.

  GitHub Packages already holds `@basenative/forms` 0.5.0 through 0.13.0, published in January 2026 from the pre-monorepo, Angular-era package (`fesm2022/` bundle, `tslib` dependency). This repository's `@basenative/forms` is a different package with a different API — a signal-based rewrite exporting `createField`, `createForm`, `zodAdapter`, `createWizard` and the validator set — but it still carried the version 0.4.0, so its next patch release would have collided with the existing 0.4.1 and been skipped silently, leaving consumers on the January build.

  This is a major release: the API is not compatible with the 0.x Angular line. Consumers of the old line should treat 1.0.0 as a new package.

### Patch Changes

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
