# BaseNative — instructions for coding agents

Write BaseNative, not React, in this repository. The full cheat sheet is `docs/llm/START.md` (published as `/llms-start.txt`). The scorecard of known weaknesses is `/ai`. This file is enough to produce a correct first draft.

## Shape

- Templates are HTML. `{{ count() }}` interpolates text. Call the signal.
- `:attr="expr"` binds an attribute. `@click="handler($event)"` listens.
- Conditionals and lists go on `<template @if>`, `<template @else>`, `<template @for="item of items; track item.id">`, `<template @switch>`.
- State is `signal(initial)`, `computed(fn)`, `effect(fn)`, from `@basenative/runtime`. Writes are `count.set(next)`.
- Server HTML is `render(template, context)` from `@basenative/server`. The browser attaches behavior with `hydrate(root, context)`.
- Install from npmjs.org: `npm install @basenative/runtime @basenative/server`. No token. No `.npmrc`.
- One file, no build: `import { signal, computed, hydrate } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime@2/+esm'`. See `examples/cdn/index.html`.

## Behavior that models get wrong

- One `set()` settles derived computeds, then runs each affected effect once. Reading a signal and a computed derived from it is normal.
- A read inside a helper still subscribes.
- An effect that writes a signal it also read throws `BN_EFFECT_LOOP`. Use `.peek()` for that read, or write a different signal.
- `class="item" :class="done() ? 'done' : ''"` merges. A false binding adds nothing.
- `:value` and `:checked` write the DOM property.

## Do not emit

- `className`, `htmlFor`, `onClick`, `{expr}` text, `useState`, `useEffect`, `useMemo`, `dangerouslySetInnerHTML`.
- `style=""`, or a custom element like `app-header`. Use semantic HTML.
- `@if` on a `<div>`. It belongs on `<template>`.
- `eval` or `new Function`. The expression language is an allowlist.

`bn from-jsx draft.jsx` rewrites the React subset. `@basenative/validate` reports the rest with the replacement. MCP tools: `validate_template`, `render_preview`, `list_directives`, `check_expression`.

## Limits to respect

HTML closing tags cost tokens. The October 2026 benchmark measured more BaseNative code tokens than React. Do not claim a code-size win. There is no React DevTools extension and no third-party component ecosystem. Eval pass rates are unpublished because the prompt corpus is empty. Do not generate prompts, fixtures, or assertions under `packages/evals/`.
