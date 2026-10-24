# BaseNative — start here

Templates are HTML. State is `signal`, `computed`, and `effect`. Server HTML comes from `render()`. The browser attaches behavior with `hydrate()`. There is no JSX, no build step, and no `eval` or `new Function`.

Read this file before writing UI. The long index is `llms.txt`. The honest scorecard of what BaseNative is bad at is `/ai`.

## Install

`@basenative/*` is on npmjs.org. No token and no `.npmrc`.

```bash
npm install @basenative/runtime @basenative/server
```

One HTML file, no install, no bundler. StackBlitz and WebContainers can open this file alone:

```html
<script type="module">
  import { signal, computed, hydrate } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime@2/+esm';
</script>
```

A full copy-paste page is `examples/cdn/index.html`.

## Counter

```html
<p class="item" :class="count() > 0 ? 'done' : ''">
  <span>{{ count() }}</span> doubled <span>{{ doubled() }}</span>
</p>
<button type="button" @click="count.set(count() + 1)">Add</button>
```

```js
import { signal, computed, effect, hydrate } from '@basenative/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

// Runs once per set, with both values already settled.
effect(() => console.log(count(), doubled()));

hydrate(document.body, { count, doubled });
```

Server render takes the same template string:

```js
import { render } from '@basenative/server';

const html = render('<p>{{ count() }}</p>', { count });
```

`render()` is synchronous and returns the HTML string. There is no promise; awaiting the result is harmless but unnecessary.

## Syntax

| Write this | Means |
|---|---|
| `{{ count() }}` | Text. Call the signal. |
| `:class="done() ? 'done' : ''"` | Attribute binding. |
| `@click="save($event)"` | Event. The handler expression runs on the event. |
| `<template @if="user">…</template>` | Conditional. On `<template>`, not on the element. |
| `<template @else>` | Follows `@if`. |
| `<template @for="item of items; track item.id">` | List. `of`, and a `track` expression. |
| `<template @switch="status">` then `<template @case="'open'">` | Match. |
| `count.set(next)` | Write. An updater is `count.set(c => c + 1)`. |
| `count.peek()` | Read without subscribing. |
| `batch(() => { … })` | Several writes, one effect pass. |

Expressions can read properties, call methods, and use arithmetic, comparisons, logical operators, ternaries, and array or object literals. They cannot run arbitrary JavaScript.

## Effects

One `set()` settles every derived `computed`, then runs each affected effect once. An effect that reads a signal and a computed derived from it is the normal pattern. It runs once.

A read inside a helper still subscribes. `effect(() => log(count()))` subscribes to `count` when `log` calls `count()`.

An effect that writes a signal it also read throws `BN_EFFECT_LOOP`. The message says to use `.peek()` or to write a different signal. Do that. Do not catch the error and retry.

```js
effect(() => {
  log.set(log.peek() + String(count()));
});
```

## Classes and form values

`class` and `:class` merge. `class="item" :class="done() ? 'done' : ''"` renders `class="item done"`. A false or null binding adds nothing. This used to replace the attribute and drop `item`.

`:value` and `:checked` write the DOM property, so clearing a signal clears the field. Writing the attribute was the bug, fixed in 2.0.1.

## React habits that fail

| React | BaseNative |
|---|---|
| `className="card"` | `class="card"` |
| `className={on ? 'on' : ''}` | `class="card" :class="on() ? 'on' : ''"` |
| `htmlFor="email"` | `for="email"` |
| `onClick={save}` | `@click="save($event)"` |
| `{user.name}` | `{{ user.name }}` |
| `useState(0)` | `signal(0)`, then `count.set` |
| `useMemo` | `computed` |
| `useEffect` | `effect` |
| `dangerouslySetInnerHTML` | `{{ text }}`. Trusted HTML is `raw()` in the context, not an attribute. |
| `<>…</>` | Delete the fragment. The parent is the wrapper. |

`bn from-jsx draft.jsx` rewrites that subset and prints a note wherever it could not. `@basenative/validate` reports the same mistakes with the replacement (`BN_E_FOREIGN_DIRECTIVE`).

A React host can keep one island: `examples/react-island/BaseNativeIsland.js` hydrates a template inside a host element. React stays in the host app. It is not a dependency of the runtime.

## Check the draft

- `validateTemplate(html)` from `@basenative/validate`.
- MCP tools on `@basenative/mcp`: `validate_template`, `render_preview`, `list_directives`, `check_expression`, `scaffold_component`.

## Rules that are not optional

- Semantic HTML only. `header`, `button`, `nav`. Not `app-header`, not `my-button`.
- No `style=""`. CSS lives in stylesheets.
- `@if`, `@for`, and `@switch` go on `<template>`, not on a `<div>`.
- Do not import `react` into a BaseNative file.

## What is still true

HTML closing tags cost tokens. The October 2026 benchmark measured 827 BaseNative tokens against 795 React tokens. That result stands. `llms.txt` is an index and does not pay for itself in code savings. This file is the short one.

The runtime has no React DevTools extension. `enableDevtools()` sets `globalThis.__BASENATIVE_DEVTOOLS__`. The `bn` CLI is the scaffolding, not an inspector.

There is no third-party component ecosystem. The component model is semantic HTML. The in-repo catalog is `@basenative/components`.

Eval pass rates are not published. The harness exists. The prompt corpus is empty on purpose and is not generated by a model.
