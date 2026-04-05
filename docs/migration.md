# Migration Guide

## v0.1.x → v0.2.0

### Breaking Changes

None. v0.2.0 is the first published release.

### New Features

- **CSP-safe expression engine**: Template expressions no longer use `eval()` or `new Function()`. All expressions are parsed and evaluated by a safe interpreter.
- **Keyed `@for` reconciliation**: Use `@for="item of items; track item.id"` for stable DOM identity across list updates.
- **Hydration diagnostics**: `hydrate()` now accepts `onDiagnostic` and `onMismatch` callbacks.
- **Browser feature detection**: `detectBrowserFeatures()` checks for `dialog`, `popover`, `anchorPositioning`, and `baseSelect`.

### Migration Steps

1. Update package versions: `pnpm update @basenative/runtime @basenative/server`
2. If you had custom `eval`-based expressions, move logic into named functions
3. Add `track` expressions to `@for` loops for better performance

## v0.2.0 → v0.3.0

### New Packages

- `@basenative/router` — Client-side and server-side routing
- `@basenative/forms` — Field state management and validation
- `@basenative/components` — 15 semantic UI components with design tokens

### Migration Steps

1. Install new packages as needed:
   ```bash
   pnpm add @basenative/router @basenative/forms @basenative/components
   ```
2. Include component CSS in your HTML:
   ```html
   <link rel="stylesheet" href="@basenative/components/tokens.css" />
   <link rel="stylesheet" href="@basenative/components/theme.css" />
   ```
3. Replace custom routing logic with `@basenative/router`
4. Replace manual form state tracking with `@basenative/forms`

### New Runtime Exports

- `enableDevtools()`, `disableDevtools()` — Debug instrumentation
- `createErrorBoundary()`, `renderWithBoundary()` — Error handling

### New Server Exports

- `@basenative/server/stream` — `renderToStream()` and `renderToReadableStream()`

---

## Framework Migration Guides

### From React to BaseNative

#### State management

```jsx
// React
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
useEffect(() => { document.title = `Count: ${count}`; }, [count]);
```

```js
// BaseNative
const count = signal(0);
const doubled = computed(() => count() * 2);
effect(() => { document.title = `Count: ${count()}`; });
```

#### Component rendering

```jsx
// React — JSX + virtual DOM
function TodoList({ items }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

```js
// BaseNative — server renders HTML, no virtual DOM
import { render } from '@basenative/server';

const html = render(`
  <ul>
    <template @for="item of items; track item.id">
      <li>{{ item.name }}</li>
    </template>
  </ul>
`, { items });
```

#### Key differences

| React | BaseNative |
|-------|------------|
| JSX requires transpilation | Native HTML, no build step |
| Virtual DOM diffs | Direct DOM mutation via signals |
| 45KB+ runtime | < 5KB gzipped runtime |
| Component = function | Component = HTML template |
| useState + useEffect | signal + effect |

---

### From Vue to BaseNative

#### Reactive state

```vue
<!-- Vue — Options API / Composition API -->
<script setup>
const count = ref(0)
const doubled = computed(() => count.value * 2)
watch(count, (val) => console.log(val))
</script>
```

```js
// BaseNative
const count = signal(0);
const doubled = computed(() => count() * 2);
effect(() => console.log(count()));
```

#### Template directives

| Vue | BaseNative | Notes |
|-----|------------|-------|
| `v-if` | `@if` | Same semantics |
| `v-else` | `@else` | Must follow `@if` template |
| `v-for` | `@for` | Add `; track item.id` for keying |
| `v-bind:attr` | `:attr` | Same shorthand syntax |
| `{{ expr }}` | `{{ expr }}` | Identical |

---

### From Svelte to BaseNative

#### Reactive declarations

```svelte
<!-- Svelte -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>
```

```js
// BaseNative
const count = signal(0);
const doubled = computed(() => count() * 2);
```

#### Template syntax

```svelte
<!-- Svelte -->
{#if active}
  <p>Active</p>
{:else}
  <p>Inactive</p>
{/if}

{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}
```

```html
<!-- BaseNative -->
<template @if="active"><p>Active</p></template>
<template @else><p>Inactive</p></template>

<template @for="item of items; track item.id">
  <li>{{ item.name }}</li>
</template>
```

#### Key differences

| Svelte | BaseNative |
|--------|------------|
| Compiler-based | No build step needed |
| Custom template syntax | Standard `<template>` elements |
| `$:` reactive declarations | `computed()` |
| Stores (`writable`, `readable`) | `signal()`, `computed()` |

---

### From Vanilla JS to BaseNative

If you're currently managing DOM manually:

```js
// Before — manual DOM manipulation
let count = 0;
const el = document.querySelector('#count');
function increment() {
  count++;
  el.textContent = count;
}
```

```js
// After — declarative with signals
import { signal, effect, hydrate } from '@basenative/runtime';

const count = signal(0);
effect(() => { document.querySelector('#count').textContent = count(); });
// Or better: use hydrate() with server-rendered HTML
hydrate(document.body, { count, increment: () => count.set(c => c + 1) });
```

SSR with BaseNative replaces manual `innerHTML` assignment:

```js
// Before
res.send(`<ul>${items.map(i => `<li>${i.name}</li>`).join('')}</ul>`);
```

```js
// After — safe, structured, hydratable
import { render } from '@basenative/server';
const html = render(
  '<ul><template @for="item of items"><li>{{ item.name }}</li></template></ul>',
  { items }
);
res.send(html);
```
