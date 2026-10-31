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
| 45KB+ runtime | 9.2KB gzipped runtime |
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

## @basenative/components 2.x → 3.0.0

### Breaking Changes

- The legacy string renderers are removed: every `render*` function
  (buttons, tables, dialogs, trees, calendars, pipelines, toasts and
  the rest of the flat module files) is gone. Each component has
  exactly one implementation — its Holy Trinity directory
  (`index.html` template, `styles.css`, `index.js` view model).
- The client initialisers are removed: every `init*` function
  (`initTabs`, `initDataGrid`, `initTree`, `initAppNav`,
  `initCalendarDragDrop`, `initPipelineDragDrop`, …). The behavior
  they carried — APG keyboard patterns, sorting, selection,
  expand/collapse, windowing — lives in each component's `create()`
  view model now.
- `renderSiteHeader`, `renderSiteNav`, `renderAppShell` and
  `renderSiteFooter` (site-chrome) and the marketing renderers
  (`renderHero`, `renderPricingCards`, `renderFeatureCard`,
  `renderStatCard`, `renderFaq`, …) are removed. Their successors
  are the `app-bar`, `app-shell`, `sidebar`, `site-footer`, `hero`
  and `card` components.
- `renderTreeGrid` has no successor component: use `tree` for
  hierarchies and `datagrid` for grids.
- The `showToast` / `dismissToast` module functions are removed;
  `createToaster()` is the toast API.
- The root export no longer carries any of the above. It exports
  the registry and loader, every component aggregate, the
  calendar-state helpers, and the retained utilities
  `renderSkeleton` and `renderLayoutGrid`.

### Migration Steps

1. Replace renderer calls with the loader:

   ```js
   import { loadRegistry, renderComponent } from '@basenative/components';
   import { render } from '@basenative/server';

   const registry = await loadRegistry();
   const { html } = renderComponent(registry, render, 'table', { columns, rows });
   ```

   Or import a component directly from its subpath —
   `@basenative/components/table`, `@basenative/components/tabs`,
   and likewise for all 47 components — plus
   `@basenative/components/registry`, `/loader` and `/ids`.

2. Replace initialiser calls with the component's view model.
   Create it from the same props, pass it to `hydrate` (or use it
   directly in client code), and drive it through its methods:
   `tabs.select(tab)`, `datagrid.sortBy(column)`,
   `tree.expand(id)`, `calendar.moveEvent(id, target)`,
   `pipeline.moveCard(fromColumn, fromIndex, toColumn, toIndex)`.
   The drag-and-drop and keyboard gestures that framed the calendar
   and pipeline initialisers are composed by the host around
   `moveEvent` / `moveCard`, which own the move, the report
   (`onDrop` / `onCardMove`) and the live-region announcement.

3. Replace `showToast(...)` with a toaster:
   `const toaster = createToaster(); const id = toaster.push({ message });`
   — ids are deterministic (`bn-toast-<n>`) and `dismiss(id)`
   removes by id.
