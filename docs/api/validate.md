# @basenative/validate

> Structured validation for BaseNative templates — machine-actionable errors a model can repair from the error object alone.

## Overview

`@basenative/validate` statically checks BaseNative template markup for the mistakes a
model (or a developer coming from Vue/Angular/Svelte/Alpine) is most likely to make.
BaseNative's syntax deliberately borrows from several ecosystems — `{{ }}`, `@for="item
of items; track item.id"`, `:disabled`, `signal()`/`computed()`/`effect()` — which makes
it easy to *read* but easy to *miswrite* as "confident regression to the nearest
neighbour" (e.g. `v-if` instead of `@if`). Every diagnostic this package produces carries
enough information — a `severity`, a `suggestion` with concrete corrected syntax, and a
`confidence` level — to be repaired from the diagnostic object alone, without consulting
documentation. Expression checking reuses `compileExpression` from
`@basenative/runtime/shared/expression`, the same CSP-safe parser `render()`/`hydrate()`
use, so the validator can't drift from what the runtime actually accepts.

## Installation

```bash
npm install @basenative/validate
```

## Quick Start

```js
import { validateTemplate } from '@basenative/validate';

const result = validateTemplate('<div v-if="isAdmin">…</div>');
// {
//   valid: false,
//   diagnostics: [{
//     code: 'BN_E_FOREIGN_DIRECTIVE',
//     severity: 'error',
//     message: '"v-if" is Vue syntax; BaseNative does not support it — BaseNative puts
//               conditionals on a <template>, not on the element itself',
//     suggestion: '<template @if="isAdmin">',
//     span: { line: 1, col: 6 },
//     confidence: 'high',
//   }],
// }

// Pass `context` to also flag references that don't exist on it:
validateTemplate('<p>{{ itmes }}</p>', { context: { items: [] } });
// → one BN_E_UNBOUND_REF diagnostic, suggestion: 'Did you mean "items"? …'
```

## API Reference

### validateTemplate(source, options?)

Validates a BaseNative template string and returns every diagnostic found.

**Parameters:**
- `source` — the template markup to check
- `options.context` — when supplied, `{{ }}` interpolations and `:attr`/expression
  directive values are checked against this object's keys and unresolved references are
  reported as `BN_E_UNBOUND_REF`; omit it to skip reference checking entirely

**Returns:** `{ valid: boolean, diagnostics: Diagnostic[] }`
- `valid` — `false` if and only if at least one diagnostic has `severity: 'error'`. A
  template with only `warning`-severity diagnostics is still `valid: true` — the
  runtime genuinely accepts it, just relying on unspecified or fragile behavior.
- `diagnostics` — sorted by source position (`span.line`, then `span.col`). Each entry
  has the shape:
  ```js
  {
    code: string,       // one of the CODES keys, e.g. 'BN_E_FOREIGN_DIRECTIVE'
    severity: 'error' | 'warning',  // see ERROR / WARNING
    message: string,    // human-facing description
    suggestion: string, // concrete corrected syntax — not a description, an actual fix
    span: { line: number, col: number },  // 1-indexed
    confidence: 'high' | 'medium' | 'low', // see CONFIDENCE
  }
  ```

**Diagnostic codes** (`CODES`, below), what each catches:

| Code | Severity | Catches |
|---|---|---|
| `BN_E_FOREIGN_DIRECTIVE` | error | Vue / Angular / Svelte / Alpine syntax, with the BaseNative equivalent as the suggestion |
| `BN_E_CONTROL_FLOW_ON_ELEMENT` | error | `@if`/`@for`/`@switch`/`@feature` written on a non-`<template>` element |
| `BN_E_UNKNOWN_DIRECTIVE` | error | An `@`-directive on a `<template>` that BaseNative does not define |
| `BN_E_EXPR_UNSUPPORTED` | error | An expression outside the CSP-safe subset `compileExpression` accepts |
| `BN_E_MALFORMED_FOR` | error | `@for` not matching `item of items` (optionally `; track item.id`) |
| `BN_E_ORPHAN_BRANCH` | error | `@else`/`@empty`/`@case`/`@default` with no governing `@if`/`@for`/`@feature`/`@switch` |
| `BN_E_UNBOUND_REF` | warning | A reference not present on the `context` object passed in `options` |

`BN_E_CONTROL_FLOW_ON_ELEMENT` is the one that matters most: on a `<template>`, `@if` is
control flow, but on any other element **every `@name` attribute is registered as an
event listener** — `<div @if="admin">` silently binds an `"if"` event and never renders
conditionally, with no error at runtime. Static validation is the only way to catch it.

---

### CODES

The diagnostic taxonomy `validateTemplate` draws from — an object keyed by code name
(`BN_E_FOREIGN_DIRECTIVE`, `BN_E_UNKNOWN_DIRECTIVE`, `BN_E_CONTROL_FLOW_ON_ELEMENT`,
`BN_E_EXPR_UNSUPPORTED`, `BN_E_UNBOUND_REF`, `BN_E_MALFORMED_FOR`,
`BN_E_ORPHAN_BRANCH`), each entry `{ severity, confidence, summary }` giving that code's
default severity/confidence and a one-line summary. `validateTemplate` builds each
diagnostic's `severity`/`confidence` from this table (a specific check may still
override either — e.g. `@for` without `track` downgrades `BN_E_MALFORMED_FOR` to a
`warning` rather than an `error`, since the runtime still renders it).

```js
import { CODES } from '@basenative/validate';

console.log(CODES.BN_E_FOREIGN_DIRECTIVE);
// { severity: 'error', confidence: 'high', summary: 'Syntax from another framework' }
```

---

### ERROR

The string constant `'error'` — the `severity` value meaning the template will not
render, or will render wrongly and silently. A `diagnostics` array containing any
`ERROR`-severity entry makes `validateTemplate`'s `valid` result `false`.

---

### WARNING

The string constant `'warning'` — the `severity` value meaning the template renders
today but relies on behavior that is unspecified or fragile (e.g. an unkeyed `@for`).
`WARNING`-only results still report `valid: true`.

---

### CONFIDENCE

An object of the three confidence levels a diagnostic's `confidence` field can hold:
`{ HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }`.

- `CONFIDENCE.HIGH` — the correction is mechanical; a model can apply the `suggestion`
  verbatim.
- `CONFIDENCE.MEDIUM` — the correction is the common case but depends on author intent
  (e.g. a "did you mean" guess for a typo'd reference).
- `CONFIDENCE.LOW` — the diagnostic is a strong signal, but the fix requires context the
  validator lacks (e.g. no close-enough name existed to guess from).

## Severity contract

`valid` is `false` only when at least one `error`-severity diagnostic is present. The
validator never reports as an error something the runtime accepts — if a future runtime
change makes something stricter or looser, the corresponding code's default in `CODES`
(and any per-call override) should move with it, not the other way around.

## Design notes

The markup scanner underlying `validateTemplate` is deliberately not a DOM parser: a DOM
parse discards byte offsets, normalizes casing, and silently repairs malformed markup —
exactly the input this package exists to complain about. Expression checking imports the
same `compileExpression` used by `@basenative/runtime` and `@basenative/server`, so
`BN_E_EXPR_UNSUPPORTED` can never diverge from what actually renders.

## License

Apache-2.0
