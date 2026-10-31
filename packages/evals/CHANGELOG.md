# @basenative/evals

## 3.0.0

### Patch Changes

- @basenative/runtime@3.0.0
  - @basenative/server@3.0.0
  - @basenative/validate@3.0.0

## 2.4.0

### Patch Changes

- Updated dependencies [4f3a5bb]
  - @basenative/runtime@2.4.0
  - @basenative/server@2.4.0
  - @basenative/validate@2.4.0

## 2.3.2

### Patch Changes

- Updated dependencies [fca7129]
  - @basenative/runtime@2.3.2
  - @basenative/server@2.3.2
  - @basenative/validate@2.3.2

## 2.3.1

### Patch Changes

- @basenative/runtime@2.3.1
  - @basenative/server@2.3.1
  - @basenative/validate@2.3.1

## 2.3.0

### Patch Changes

- @basenative/runtime@2.3.0
  - @basenative/server@2.3.0
  - @basenative/validate@2.3.0

## 2.2.0

### Patch Changes

- @basenative/runtime@2.2.0
  - @basenative/server@2.2.0
  - @basenative/validate@2.2.0

## 2.1.0

### Patch Changes

- @basenative/runtime@2.1.0
  - @basenative/server@2.1.0
  - @basenative/validate@2.1.0

## 2.0.1

### Patch Changes

- Updated dependencies
  - @basenative/runtime@2.0.1
  - @basenative/server@2.0.1
  - @basenative/validate@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies
  - @basenative/runtime@2.0.0
  - @basenative/server@2.0.0
  - @basenative/validate@2.0.0

## 0.1.1

### Patch Changes

- ae4701e: First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

  Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

  The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.

- Updated dependencies [ae4701e]
  - @basenative/runtime@0.6.4
  - @basenative/server@0.6.4
  - @basenative/validate@0.3.1
