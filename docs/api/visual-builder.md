# @basenative/visual-builder

> No-code template builder for composing BaseNative component layouts

## Overview

`@basenative/visual-builder` provides a programmatic canvas for building component layouts without writing HTML. Nodes are placed on a grid, connected, and serialized to BaseNative HTML templates. Designed to power drag-and-drop UI builders.

## Installation

```bash
npm install @basenative/visual-builder
```

## Quick Start

```js
import {
  createCanvas,
  renderCanvas,
  serialize,
  deserialize,
  exportToHTML,
  createComponentPalette,
} from '@basenative/visual-builder';

// Create a canvas
const canvas = createCanvas({ width: 1200, height: 800, gridSize: 8 });

// Add nodes
const headingId = canvas.addNode({
  type: 'heading',
  x: 40, y: 40,
  width: 400, height: 60,
  props: { level: 1, text: 'Hello World' },
});

const buttonId = canvas.addNode({
  type: 'button',
  x: 40, y: 120,
  width: 120, height: 40,
  props: { label: 'Click me', variant: 'primary' },
});

// Export to HTML template
const html = exportToHTML(canvas);
console.log(html);
// → <h1>Hello World</h1><button class="btn btn--primary">Click me</button>

// Save / restore state
const saved = serialize(canvas);
const restored = deserialize(saved);
```

## API Reference

### createCanvas(options)

Creates a new builder canvas.

**Options:**
- `width` — canvas width in pixels (default: `1024`)
- `height` — canvas height in pixels (default: `768`)
- `gridSize` — snap grid size in pixels (default: `8`)

**Returns:** `Canvas` with:
- `addNode(node)` — add a component node; returns its generated `id`
- `updateNode(id, props)` — update a node's properties
- `removeNode(id)` — remove a node
- `getNode(id)` — get a node by id
- `getNodes()` — get all nodes as an array
- `undo()` — undo the last action
- `redo()` — redo the last undone action
- `subscribe(fn)` — listen to canvas events (`'add'`, `'update'`, `'remove'`)
- `width`, `height`, `gridSize` — read-only dimensions

---

### renderCanvas(canvas)

Renders all canvas nodes to an HTML string using `@basenative/server`.

**Returns:** `string` — HTML

---

### renderNode(node)

Renders a single canvas node to HTML.

**Returns:** `string` — HTML fragment

---

### serialize(canvas)

Serializes canvas state to a JSON string. Version-stamped for future migrations.

**Returns:** `string` — JSON

---

### deserialize(json)

Loads a serialized JSON string back into a new `Canvas` instance.

**Returns:** `Canvas`

---

### exportToHTML(canvas)

Exports the canvas as a standalone BaseNative HTML template string suitable for use with `@basenative/server`.

**Returns:** `string` — HTML template

---

### importFromHTML(html)

Parses a BaseNative HTML template and reconstructs a canvas from it.

**Returns:** `Canvas`

---

### createComponentPalette(options)

Creates a component palette for a drag-and-drop UI.

**Options:**
- `components` — array of component definitions to offer in the palette

**Returns:** `Palette` with:
- `getComponents()` — get all palette components
- `getComponent(type)` — get a specific component definition
- `addComponent(def)` — register a custom component

### BnCanvas (`<bn-canvas>` custom element)

Client-side Web Component wrapping `createCanvas`/`renderNode` in a drag-and-drop editing surface. Registers itself as `<bn-canvas>` on import (a no-op if already registered). Uses `display: contents` on the host so it never affects page layout, per the BaseNative axioms.

```html
<script type="module">
  import '@basenative/visual-builder'; // registers <bn-canvas>
</script>

<bn-canvas width="1200" height="800" grid-size="8" mode="edit"></bn-canvas>

<script type="module">
  const el = document.querySelector('bn-canvas');
  el.registerComponents({
    heading: (node) => `<h1>${node.props.text}</h1>`,
    button: (node) => `<button class="btn btn--${node.props.variant}">${node.props.label}</button>`,
  });
  el.addEventListener('bn-canvas-change', (e) => console.log(e.detail));
</script>
```

**Attributes:**
- `width` — canvas width in pixels; default `1024`
- `height` — canvas height in pixels; default `768`
- `grid-size` — snap grid size in pixels; default `8`
- `mode` — `'edit'` (shows the selection outline and enables drag/drop) or `'preview'`; default `'edit'`

**Properties/methods:**
- `.canvas` — the underlying `Canvas` instance (same object `createCanvas` returns)
- `.selectedId` — currently selected node's id, or `null`
- `.registerComponents(componentMap)` — merges `{ [nodeType]: (node) => htmlString }` render functions used to draw nodes on the canvas, then re-renders

**Events** (all `CustomEvent`, `bubbles: true`):
- `bn-canvas-add` / `bn-canvas-remove` / `bn-canvas-move` / `bn-canvas-select` — mirror the underlying canvas's `subscribe()` events plus selection; `detail` shape matches the corresponding `Canvas` event
- `bn-canvas-change` — fired after every one of the above, with `detail: { event, data }`

**Keyboard shortcuts** (when the element has focus): `Delete`/`Backspace` removes the selected node; `Ctrl/Cmd+Z` undoes; `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` redoes.

Components dropped from an external palette are read via the `text/bn-component-type` and `text/bn-component-props` (JSON) drag-and-drop data transfer types — pair with a palette built from `createComponentPalette` that sets those on `dragstart`.

## Integration

Use with `@basenative/marketplace` to load community components into the palette:

```js
const palette = createComponentPalette({ components: [] });
const registry = createRegistry();
const communityComponents = await registry.search('input');
for (const comp of communityComponents) {
  palette.addComponent({ type: comp.name, ...comp });
}
```

## License

Apache-2.0
