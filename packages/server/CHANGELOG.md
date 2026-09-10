# @basenative/server

## 0.6.1

### Patch Changes

- ebecc61: Static attribute values in a template are re-emitted inside double quotes; a single-quoted value containing `"` could previously break out of them. Bare double quotes in static values are now written as `&quot;` (existing entities are left intact).
- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 0.6.0

### Minor Changes

- 62d9857: Add a general template-directive extension hook and the `@feature` / `@t` directives.

  - **runtime / server**: new `registerDirective(name, { on: 'template' | 'element', server, client })` in `@basenative/runtime/shared/directives`, consulted by both the SSR renderer and client hydrate/bind loops, so other packages can add directives without the core importing them. Additive; existing directives are unchanged.
  - **flags**: `<template @feature="flagName">` / `@else`, driven by a synchronous `ctx.$flags` created with the new `createFlagContext(flagManager, context?)`. With no provider the block renders as disabled and a `BN_FEATURE_NO_PROVIDER` diagnostic is emitted.
  - **i18n**: `<el @t="message.key">fallback</el>` sets the element text from `ctx.$i18n.t(key, ctx)`; re-renders on `onLocaleChange()` client-side. With no provider the existing content is preserved and `BN_T_NO_PROVIDER` is emitted.
  - **validate / mcp**: both directives are recognised by the validator's known-directive list and listed in the MCP directive reference.

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 0.5.0

### Minor Changes

- d3e979d: Security: close a sandbox escape in the CSP-safe expression evaluator, and escape SSR output by default.

  **Evaluator sandbox escape (runtime — critical).** `safeMemberRead` consulted its blocklist only for string keys, so a non-string computed key such as `x[["constructor"]]` skipped the guard and was coerced to `"constructor"` by the property read itself, reaching `Function` — arbitrary code execution from an ordinary `{{ }}` expression, in both the client runtime and SSR. Keys are now resolved with ToPropertyKey semantics _before_ the blocklist check, and object/array computed keys are rejected outright.

  **SSR output escaping (server — high).** `render()` performed no HTML escaping, so any application rendering user-supplied data was XSS-injectable with no malicious template required. Interpolated values and `:attr` bindings are now HTML-escaped on both server and client (one shared module, so the two sides cannot diverge again); URL-bearing attributes (`href`, `src`, `action`, `formaction`, …) reject `javascript:`, `vbscript:`, `data:`, `blob:` and `file:` schemes and report `BN_UNSAFE_URL`; `'` is escaped in attribute values. Static template markup is never escaped — only substituted data.

  **New API.** `raw(value)`, exported from `@basenative/runtime`, is the explicit per-value opt-out for trusted markup. It does not bypass the URL-scheme guard. `findInterpolations` is exported from `@basenative/runtime/shared/escape` — a linear scanner that replaces the polynomial `{{ }}` regex on the untrusted-input path.

  **Behaviour change.** Templates that relied on unescaped interpolation to inject markup must now wrap those values in `raw()`.

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
