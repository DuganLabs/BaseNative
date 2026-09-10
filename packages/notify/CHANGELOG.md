# @basenative/notify

## 0.3.1

### Patch Changes

- b68ae96: `renderEmail`'s `{{ variable }}` interpolation now escapes with `@basenative/runtime/shared/escape` (`escapeAttr`) instead of a local copy of the same logic, so HTML email templates and the SSR renderer can't drift apart. Behavior is unchanged for existing callers — every substituted value is still escaped by default — but a value wrapped in `raw()` (from `@basenative/runtime/shared/escape`) is now supported as an explicit, documented opt-out for trusted HTML, matching the SSR renderer's convention. Adds `@basenative/runtime` as a dependency.
- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 0.3.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata
