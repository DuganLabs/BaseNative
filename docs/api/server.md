# @basenative/server API

## `render(html, ctx?, options?)`

Renders an HTML template string with the given context. Processes all BaseNative directives server-side.

```js
import { render } from '@basenative/server';

const html = render(`
  <h1>{{ title }}</h1>
  <template @for="item of items; track item.id">
    <p>{{ item.name }}</p>
  </template>
`, {
  title: 'My Page',
  items: [
    { id: 1, name: 'Item A' },
    { id: 2, name: 'Item B' },
  ],
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `hydratable` | `boolean` | Emit `<!--bn:...-->` marker comments for hydration diagnostics |
| `onDiagnostic` | `(diagnostic) => void` | Callback for diagnostic events during rendering |

### Hydratable Mode

```js
const html = render(template, ctx, { hydratable: true });
// Output includes <!--bn:if-->...<!--/bn:if--> markers
```

### Server-Side Directives

All template directives (`@if`, `@for`, `@switch`, `:attr`, `{{ }}`) are evaluated at render time. Event handlers (`@click`, `@input`) are stripped from the output (they activate on client hydration).
