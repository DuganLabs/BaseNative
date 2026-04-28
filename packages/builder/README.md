# @basenative/builder

Signal-based drag-and-drop component builder for BaseNative. Compose layouts visually, edit props through a reactive inspector, and generate clean BaseNative template code as output.

- **Zero dependencies** beyond `@basenative/runtime`.
- **Dogfoods BaseNative signals** — every piece of builder state is a `signal()`.
- **Native HTML5 drag-and-drop** — no shadow DOM, no custom DnD layer.
- **Semantic HTML** with full ARIA roles (`role="tree"`, `role="application"`, `role="toolbar"`).
- **`display: contents` on every host element** — wrappers do not affect layout.
- **CSP-safe code generation** — output is plain HTML/templates; no `eval`.

## Install

```bash
pnpm add @basenative/builder
```

## Quick start (programmatic)

```js
import { createBuilderState, defaultPalette, generateBaseNative } from '@basenative/builder';

const palette = defaultPalette();
const state = createBuilderState();

const hero = state.addNode(null, { type: 'section', props: { class: 'hero' } });
state.addNode(hero.id, { type: 'heading', props: { level: 'h1', text: 'Welcome' } });
state.addNode(hero.id, { type: 'text', props: { text: 'A quiet runtime.' } });

console.log(generateBaseNative(state, { palette }));
```

Output:

```html
<section class="hero" role="region">
  <h1>Welcome</h1>
  <p>A quiet runtime.</p>
</section>
```

## Quick start (in the browser)

```html
<bn-builder></bn-builder>

<script type="module">
  import '@basenative/builder';

  const builder = document.querySelector('bn-builder');
  builder.addEventListener('bn-builder-export', (e) => {
    console.log(e.detail.code);
  });
</script>
```

The `<bn-builder>` element mounts four panes:

| Element | Role |
| --- | --- |
| `<bn-builder-palette>` | Drag source for components |
| `<bn-builder-canvas>` | Drop target — live preview of the tree |
| `<bn-builder-tree>` | Hierarchical outline of nodes |
| `<bn-builder-inspector>` | Reactive form for editing props and signal bindings |

## Signal bindings

Each node has a `bindings` map that wires a prop name to a signal in user scope. The codegen emits this as a BaseNative directive:

```js
const node = state.addNode(null, { type: 'input' });
state.setBinding(node.id, 'value', { ref: 'username' });

generateBaseNative(state, { palette, signals: { username: '' } });
```

Output:

```html
<script type="module">
  import { signal } from '@basenative/runtime';

  const username = signal("");
</script>
<input type="text" @bind="username" />
```

For text content:

```js
state.setBinding(id, 'text', { ref: 'count' });
// → <span>{{ count() }}</span>
```

## Public API

```ts
createBuilderState(options?): BuilderState
createPalette(): ComponentPalette
defaultPalette(): ComponentPalette
generateBaseNative(state, options?): string
renderTreeView(state): string
renderInspector(state, palette): string
```

`BuilderState` exposes signals (`tree`, `selection`, `hover`, `canUndo`, `canRedo`) and actions (`addNode`, `removeNode`, `updateProps`, `setBinding`, `moveNode`, `duplicateNode`, `select`, `undo`, `redo`, `clear`, `toJSON`, `fromJSON`, `subscribe`).

The signals are first-class — wire them into your own `effect()` to react to user edits:

```js
import { effect } from '@basenative/runtime';

effect(() => console.log('Tree size:', state.tree().length));
```

## Default palette

| Type | Tag | Container | Category |
| --- | --- | --- | --- |
| `section` | `<section role="region">` | yes | layout |
| `stack` | `<div>` | yes | layout |
| `grid` | `<div>` | yes | layout |
| `heading` | `<h1>`–`<h6>` | no | text |
| `text` | `<p>` | no | text |
| `button` | `<button>` | no | inputs |
| `input` | `<input>` | no | inputs |
| `textarea` | `<textarea>` | no | inputs |
| `checkbox` | `<input type="checkbox">` | no | inputs |
| `label` | `<label>` | yes | inputs |
| `form` | `<form>` | yes | inputs |
| `link` | `<a>` | no | navigation |
| `image` | `<img>` | no | media |
| `signal-text` | `<span>{{ … }}</span>` | no | reactive |

Register your own:

```js
palette.register({
  type: 'kbd',
  tag: 'kbd',
  category: 'text',
  props: [{ name: 'text', kind: 'string', label: 'Key' }],
  defaults: { text: '⌘K' },
});
```

## Persistence

```js
const json = state.toJSON();
// store somewhere

state.fromJSON(json); // wipes history, hydrates tree
```

## Keyboard shortcuts (canvas)

| Keys | Action |
| --- | --- |
| `Delete` / `Backspace` | Remove selected node |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` / `Cmd/Ctrl + Y` | Redo |

## Tests

```bash
cd packages/builder && node --test
```

Tests are written with `node:test` — no Jest, no Vitest, no browser harness required for the pure logic. Web component tests require a DOM and are exercised in downstream apps.
