# @basenative/builder

Signal-backed drag-and-drop component builder that emits clean BaseNative source.

The builder is a **hierarchical** authoring surface (parent/child tree, semantic
HTML tags) that compiles to a BaseNative module string — distinct from
`@basenative/visual-builder`, which is the lower-level positional canvas /
JSON-serialization primitive.

## What you get

- **`createBuilderState()`** — signal-backed tree with `addNode` / `removeNode` /
  `moveNode` / `updateProps` / `updateBindings` / `updateEvents`, atomic
  undo/redo via snapshot stack, and a `selectedId` / `selectedNode` signal pair.
- **`createDefaultPalette()`** — built-in components: `main`, `section`,
  `article`, `grid`, `heading`, `paragraph`, `button`, `input`, `textarea`,
  `form`, `label`. Register your own with `palette.register({ type, tag, … })`.
- **`generateComponent(state, palette)`** — emits a BaseNative module:
  ```js
  import { signal } from '@basenative/runtime';

  export function BuiltComponent() {
    const username = signal("");

    return `
      <main>
        <input type="text" name="field" value="{{ username() }}">
      </main>
    `;
  }
  ```
  Signal bindings render as `attr="{{ name() }}"`, events as `@click="…"`, and
  text props/values are escaped against HTML injection and template-literal
  injection (`` ` `` and `${`).
- **`renderCanvas` / `renderTreeView` / `renderInspector` / `renderPalette`** —
  signal-driven DOM renderers. Each subscribes to the parts of state it needs
  and returns a disposer.
- **DnD helpers** — `attachPaletteSource`, `attachNodeSource`,
  `attachDropTarget` use native HTML5 `dragstart` / `dragover` / `drop` events
  with two custom MIME types (`application/x-basenative-palette`,
  `application/x-basenative-node`).

## Quick start

```js
import { createBuilder } from '@basenative/builder';

const builder = createBuilder({
  canvas: document.querySelector('#canvas'),
  tree: document.querySelector('#tree'),
  inspector: document.querySelector('#inspector'),
  paletteTarget: document.querySelector('#palette'),
});

document.querySelector('#export').addEventListener('click', () => {
  console.log(builder.generate({ componentName: 'LandingPage' }));
});
```

Standalone (headless) usage — useful for tests, codegen pipelines, AI agents:

```js
import { createBuilderState, createDefaultPalette, generateComponent } from '@basenative/builder';

const state = createBuilderState();
const palette = createDefaultPalette();

const heading = state.addNode({ type: 'heading', props: { text: 'Welcome' } });
const button = state.addNode({ type: 'button', props: { text: 'Sign in' } });
state.updateEvents(button, { click: 'open()' });

console.log(generateComponent(state, palette, { componentName: 'Landing' }));
```

## Constitution compliance

- **Semantic HTML only** — palette types map directly to `main`, `section`,
  `h2`, `p`, `button`, etc. No `app-*` / `bn-*` host names in generated output.
- **Zero inline styles** — generated markup carries `class=""` and `style=""`
  only if the user explicitly sets them; the builder never injects layout
  styles.
- **Trinity-friendly output** — `generateComponent` produces a single-file
  module: state (`signal()`), template (HTML in a tagged string), all in one
  exported function.
- **Zero external deps** — only depends on `@basenative/runtime`.

## Tests

```bash
cd packages/builder && node --test
```
