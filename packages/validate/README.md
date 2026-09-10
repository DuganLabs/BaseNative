# @basenative/validate

Structured validation for BaseNative templates. Every diagnostic is designed to be
**repairable by a model from the error object alone, with no access to documentation.**

```js
import { validateTemplate } from '@basenative/validate';

validateTemplate('<div v-if="isAdmin">…</div>');
// {
//   valid: false,
//   diagnostics: [{
//     code: 'BN_E_FOREIGN_DIRECTIVE',
//     severity: 'error',
//     message: '"v-if" is Vue syntax; BaseNative does not support it — BaseNative puts
//               conditionals on a <template>, not on the element itself',
//     suggestion: '<template @if="isAdmin">',
//     span: { line: 1, col: 6 },
//     confidence: 'high'
//   }]
// }
```

Pass a `context` to also check references:

```js
validateTemplate('<p>{{ itmes }}</p>', { context: { items: [] } });
// → BN_E_UNBOUND_REF, suggestion: 'Did you mean "items"? …'
```

## Why this exists

BaseNative's syntax is a hybrid of four ecosystems: `{{ }}` from Vue/Angular,
`@for="item of items; track item.id"` near-verbatim from Angular 17, `:disabled`
from Vue, `signal()`/`computed()`/`effect()` from Solid. That familiarity makes it
trivially *readable* — and makes the failure mode **confident regression to the
nearest neighbour**. A model under load emits `v-if`, or Angular's block form, or
`$state`, rather than inventing something novel.

Reading is not writing. This package measures the difference.

## Diagnostic codes

| Code | Severity | Catches |
|---|---|---|
| `BN_E_FOREIGN_DIRECTIVE` | error | Vue / Angular / Svelte / Alpine syntax, with the BaseNative equivalent |
| `BN_E_CONTROL_FLOW_ON_ELEMENT` | error | `@if`/`@for`/`@switch` on a non-`<template>` element |
| `BN_E_UNKNOWN_DIRECTIVE` | error | An `@`-directive BaseNative does not define |
| `BN_E_EXPR_UNSUPPORTED` | error | Expression outside the CSP-safe subset, or blocked prototype access |
| `BN_E_MALFORMED_FOR` | error / warning | `@for` not matching `item of items`; missing `track` warns |
| `BN_E_ORPHAN_BRANCH` | error | `@else`/`@empty`/`@case`/`@default` with no governing directive |
| `BN_E_UNBOUND_REF` | warning | Reference absent from the supplied context |

### `BN_E_CONTROL_FLOW_ON_ELEMENT` is the one that matters most

On a `<template>`, `@if` is control flow. On any other element, **every `@name`
attribute is registered as an event listener**. So `<div @if="admin">` silently
binds an `"if"` event and never renders conditionally — with no runtime error at
all. It is the one mistake in the language that is completely invisible without
static validation.

## Severity contract

`valid` is `false` only when at least one `error`-severity diagnostic is present.

The validator never reports as an error something the runtime accepts. `@for`
without `track` renders fine (it forfeits keyed reconciliation), so it warns rather
than fails — a validator that disagrees with the thing it validates is worse than
no validator.

## Design notes

Expression checking imports `compileExpression` from
`@basenative/runtime/shared/expression` — the *same parser the evaluator uses*.
A second, independent expression parser would drift from the runtime, which is
precisely the class of bug this package exists to catch.

The markup scanner is deliberately not a DOM parser: a DOM parse discards byte
offsets, normalises casing, and silently repairs malformed markup — which is
exactly the input we are here to complain about.

## License

Apache-2.0
