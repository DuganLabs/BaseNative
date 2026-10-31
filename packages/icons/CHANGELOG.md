# @basenative/icons

## 3.1.0

No changes in this release.

## 3.0.0

No changes in this release.

## 2.4.0

No changes in this release.

## 2.3.2

No changes in this release.

## 2.3.1

No changes in this release.

## 2.3.0

No changes in this release.

## 2.2.0

No changes in this release.

## 2.1.0

### Minor Changes

- bbedbac: Fill the design-system gaps that forced every property into one-off local builds. `@basenative/components` gains an exported field component (`renderField`, plus the `renderFormField` composer over the built-in controls), site chrome (`renderSiteHeader` with `initSiteHeader`, `renderSiteNav`, `renderSiteFooter`, `renderAppShell`), and marketing primitives (`renderHero`, `renderPricingCard`/`renderPricingCards`, `renderFeatureCard`, `renderStatCard`, `renderFaq`/`renderFaqItem`) — all in the existing idiom of pure render functions over `--bn-*` tokens, with matching styles in `components.css`, catalog and showcase entries, and API docs. `@basenative/icons` grows from 5 glyphs to a 29-icon core set covering the concepts product UI draws by hand today (dashboard, leads, jobs, campaigns, inventory, vehicles, reviews, reports, chat, settings, and the standard utility glyphs).

## 2.0.1

No changes in this release.

## 2.0.0

No changes in this release.

## 0.1.1

### Patch Changes

- ae4701e: First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

  Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

  The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.
