# @basenative/runtime API

## `signal(initial)`

Creates a reactive signal.

```js
const count = signal(0);
count();        // read: 0
count.set(5);   // write
count.set(c => c + 1); // updater
count.peek();   // read without subscribing
```

## `computed(fn)`

Creates a derived signal that re-evaluates when dependencies change.

```js
const double = computed(() => count() * 2);
```

## `effect(fn)`

Runs a function reactively. Re-runs when any signal read inside changes. Returns a handle with `.dispose()`.

```js
const stop = effect(() => {
  console.log('Count is', count());
  return () => console.log('cleanup');
});
stop.dispose(); // stops the effect
```

## `hydrate(root, ctx, options?)`

Activates template directives in a DOM subtree. Returns a dispose function.

```js
const dispose = hydrate(document.getElementById('app'), {
  count,
  items: signal([]),
  increment() { count.set(c => c + 1); },
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `onDiagnostic` | `(diagnostic) => void` | Callback for diagnostic events |
| `onMismatch` | `(message, detail) => void` | Callback for hydration mismatches |
| `recover` | `'client' \| 'throw'` | Mismatch recovery strategy |

## Template Directives

### `@if` / `@else`

```html
<template @if="isLoggedIn()">
  <p>Welcome back!</p>
</template>
<template @else>
  <p>Please log in.</p>
</template>
```

### `@for` / `@empty`

```html
<template @for="item of items(); track item.id">
  <div>{{ item.name }}</div>
</template>
<template @empty>
  <p>No items.</p>
</template>
```

Loop variables: `$index`, `$first`, `$last`, `$even`, `$odd`.

### `@switch` / `@case` / `@default`

```html
<template @switch="status()">
  <template @case="'active'"><span>Active</span></template>
  <template @case="'inactive'"><span>Inactive</span></template>
  <template @default><span>Unknown</span></template>
</template>
```

### Event Binding — `@event`

```html
<button @click="handleClick()">Click</button>
<input @input="updateValue($event.target.value)">
```

### Attribute Binding — `:attr`

```html
<button :disabled="isLoading()">Save</button>
<div :class="isActive() ? 'active' : ''">Content</div>
```

### Text Interpolation — `{{ }}`

```html
<p>Hello, {{ name() }}!</p>
<span>{{ items().length }} items</span>
```

### Custom Directives — `registerDirective(name, config)`

`@if`/`@for`/`@switch`/`@defer` are built into `render()` and `hydrate()` directly. Other packages contribute directives (`@feature` from `@basenative/flags`, `@t` from `@basenative/i18n`) through this registry instead, so `@basenative/runtime` and `@basenative/server` never import them — they only consult the registry by name. Importing a directive-providing package registers it as a side effect; `render()`/`hydrate()` need no further wiring.

```js
import { registerDirective } from '@basenative/runtime';
// or: import { registerDirective } from '@basenative/runtime/shared/directives';

registerDirective('tooltip', {
  on: 'element',                                    // 'template' | 'element' (default)
  server: (value, ctx, options) => value,           // string (or raw()) to use as text content
  client: (value, ctx, options) => value,
});
```

Two kinds, matching the two places a `@name` attribute appears:

- **`on: 'template'`** — control flow on a `<template>`, dispatched like `@if`: the handler returns a boolean. `true` renders the template's own content; `false` renders a following `<template @else>` sibling if present, otherwise nothing. Example: `@feature`.
- **`on: 'element'`** (default) — content on any other element, dispatched like `{{ }}`: the handler returns the string (or a `raw()`-wrapped HTML string) to use as the element's text content. Returning `undefined` leaves the element's existing content untouched — a directive can fall back to whatever static markup the template already has. Example: `@t`.

`server` and `client` are both optional — supply whichever side(s) the directive needs. Both are called as `(value, ctx, options) => result`, where `value` is the attribute's raw string value. On the client, if the handler reads a `signal()` internally, the surrounding `effect()` that `hydrate()` already wraps every directive-driven update in re-runs automatically — no extra reactivity plumbing needed.

Also exported: `unregisterDirective(name)` and `getDirective(name)` (mainly for tests), and `listDirectives()`.

## `detectBrowserFeatures()`

Returns a `BrowserFeatures` object with support flags.

## `supportsFeature(name)`

Checks a single feature: `'dialog'`, `'popover'`, `'anchorPositioning'`, `'baseSelect'`.

## `emitDiagnostic(options, diagnostic)`

Emits a structured diagnostic through the options callback.

## `reportHydrationMismatch(options, message, detail?)`

Reports a hydration mismatch event.
