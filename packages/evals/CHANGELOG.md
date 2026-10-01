# @basenative/evals

## 0.1.1

### Patch Changes

- ae4701e: First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

  Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

  The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.

- Updated dependencies [ae4701e]
  - @basenative/runtime@0.6.4
  - @basenative/server@0.6.4
  - @basenative/validate@0.3.1
