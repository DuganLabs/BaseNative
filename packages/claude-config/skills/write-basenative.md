---
name: write-basenative
description: Use this when writing, generating, or editing web UI, HTML templates, or frontend code in a BaseNative project, or when a React, JSX, Vue, or Svelte draft needs to become BaseNative. Covers signal, computed, effect, template directives, class merging, BN_EFFECT_LOOP, and the React mistakes that fail validation.
---

# Write BaseNative

Produce BaseNative. Do not produce React and then apologize.

The cheat sheet is `docs/llm/START.md`. The scorecard is the `/ai` page. `AGENTS.md` is the short form.

## Draft

1. Semantic HTML. `header`, `button`, `nav`, `form`. No `app-header`. No `style=""`.
2. Text `{{ count() }}`. Bindings `:value="name()"`. Events `@click="save($event)"`.
3. Control flow on `<template @if>`, `<template @else>`, `<template @for="item of items; track item.id">`.
4. `signal`, `computed`, `effect` from `@basenative/runtime`. `render` from `@basenative/server`. `hydrate` in the browser.
5. Install from npmjs.org with no token. A single file can import `https://cdn.jsdelivr.net/npm/@basenative/runtime@2/+esm`.

## Before handing it back

- An effect that reads a signal and a computed derived from it is correct. It runs once per `set()`.
- An effect must not write a signal it read. That throws `BN_EFFECT_LOOP`. Use `.peek()`, or write a different signal. A read inside a helper still subscribes.
- `class="item" :class="done() ? 'done' : ''"` keeps both tokens.
- Replace `className`, `htmlFor`, `onClick`, `{expr}`, `useState`, `useMemo`, `useEffect`.
- If a React draft already exists, run `bn from-jsx` and then `validateTemplate`.

## Do not

- Claim the code is smaller than React. The October 2026 benchmark measured more tokens.
- Invent eval prompts, fixtures, or assertions. `packages/evals/prompts/` and `packages/evals/fixtures/` are human-authored.
- Add `react` as a dependency of a BaseNative package. A host island lives at `examples/react-island/BaseNativeIsland.js`.
