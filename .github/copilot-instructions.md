# BaseNative

Write BaseNative HTML templates, not React or JSX. Follow `docs/llm/START.md` and `AGENTS.md`. The scorecard is the `/ai` page.

- Text is `{{ count() }}`. Attributes are `:class="expr"`. Events are `@click="handler($event)"`.
- `@if`, `@for`, and `@switch` go on `<template>`, not on the element.
- State is `signal`, `computed`, `effect`. Write with `.set()`. Read without subscribing with `.peek()`.
- One `set()` runs each affected effect once, after derived computeds settle.
- An effect that writes a signal it also read throws `BN_EFFECT_LOOP`. Use `.peek()` or write a different signal.
- `class` and `:class` merge. `:value` writes the DOM property.
- Install with `npm install @basenative/runtime @basenative/server` from npmjs.org. No token.
- No `className`, `htmlFor`, `onClick`, `{expr}`, `style=""`, or custom elements like `app-header`.
- Do not generate files under `packages/evals/prompts/` or `packages/evals/fixtures/`.
