# @basenative/visual-builder

> No-code drag-and-drop canvas for composing BaseNative templates visually

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

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
const canvas = createCanvas({ width: 1280, height: 800, gridSize: 8 });

// Add nodes
const buttonId = canvas.addNode({
  type: 'button',
  props: { label: 'Click me', variant: 'primary' },
  position: { x: 100, y: 100 },
  size: { width: 120, height: 40 },
});

// Move, update, and remove nodes
canvas.updateNode(buttonId, { props: { label: 'Submit' } });
canvas.moveNode(buttonId, { x: 200, y: 150 });

// Undo/redo
canvas.undo();
canvas.redo();

// Export to HTML
const html = exportToHTML(canvas.getNodes());
console.log(html);
```

## Serialization

```js
// Save canvas state
const json = serialize(canvas.getNodes());
localStorage.setItem('canvas', JSON.stringify(json));

// Restore canvas state
const restored = deserialize(JSON.parse(localStorage.getItem('canvas')));
```

## API

### `createCanvas(options?)`

Creates a visual builder canvas. Options: `width` (default: 1024), `height` (default: 768), `gridSize` (default: 8).

Returns:

- `addNode(node)` — Adds a node to the canvas. Returns the node ID.
- `removeNode(id)` — Removes a node by ID.
- `updateNode(id, patch)` — Merges a partial update into a node's properties.
- `moveNode(id, position)` — Updates a node's `{ x, y }` position.
- `getNode(id)` — Returns a single node by ID.
- `getNodes()` — Returns all nodes as an array.
- `undo()` / `redo()` — Undo/redo the last canvas action.
- `subscribe(fn)` — Subscribes to canvas events `(event, data)`. Returns an unsubscribe function.
- `clear()` — Removes all nodes from the canvas.

### `renderCanvas(nodes, options?)` / `renderNode(node, options?)`

Renders canvas nodes to an HTML string for preview.

### `serialize(nodes)` / `deserialize(json)`

Converts a node array to a serializable JSON structure and back.

### `exportToHTML(nodes, options?)` / `importFromHTML(html)`

Exports the canvas as a standalone HTML fragment, or imports nodes from an HTML string.

### `createComponentPalette(options?)`

Creates a palette of available component types for the builder UI. Options: `components` — array of component definitions to register.

## License

MIT
