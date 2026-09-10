# @basenative/builder

> Signal-based drag-and-drop component builder for BaseNative — composes layouts, generates clean BaseNative code

## Overview

`@basenative/builder` is a tree-based visual builder: a mutable component tree (nodes with `type`, `props`, `bindings`, `children`) held in `@basenative/runtime` signals, a palette describing which component types can be placed and what props they expose, a code generator that turns the tree into BaseNative-flavored HTML, and a set of custom elements (`<bn-builder>` and friends) that assemble the tree, palette, canvas, inspector, and layer list into a working drag-and-drop editor. Every mutation goes through a single `commit()` path internally, which is what gives the builder its undo/redo history.

This package is functionally distinct from `@basenative/visual-builder` (see [`docs/api/visual-builder.md`](./visual-builder.md)): `visual-builder` positions nodes freely on an x/y canvas grid, while `@basenative/builder` models a strict parent/child tree with signal-backed state, prop bindings to named signals, and its own code generator. The two packages do not import from each other and are not interchangeable.

## Installation

```bash
npm install @basenative/builder
```

A default stylesheet for the builder's `bn-*` classes and `data-bn-*` hooks is available at `@basenative/builder/builder.css` — link it or `@import` it alongside the JS.

## Quick Start

```js
import { createBuilderState, defaultPalette, generateBaseNative } from '@basenative/builder';

const palette = defaultPalette();
const state = createBuilderState();

state.addNode(null, { type: 'heading', props: { level: 'h1', text: 'Welcome' } });
const button = state.addNode(null, {
  type: 'button',
  props: { text: 'Get started', variant: 'primary' },
});

state.select(button.id);
state.updateProps(button.id, { variant: 'secondary' });

const html = generateBaseNative(state, { palette, document: true, title: 'My Page' });
```

Or drop in the full editor UI as a custom element:

```html
<script type="module">
  import '@basenative/builder';
</script>

<bn-builder></bn-builder>

<script type="module">
  document.querySelector('bn-builder').addEventListener('bn-builder-export', (e) => {
    console.log(e.detail.code); // generated BaseNative HTML string
  });
</script>
```

## API Reference

### State

#### createBuilderState(options = {})

Creates a signal-backed component tree with undo/redo history.

**Parameters:**
- `options.initial` — a node spec (`{ type, id?, props?, bindings?, children? }`) or array of node specs used to seed the tree; omit for an empty builder
- `options.maxHistory` — maximum number of undo snapshots kept; default `100`

**Returns:** a builder state object:
- `tree`, `selection`, `hover` — `@basenative/runtime` signals; call as a function to read reactively, or `.peek()` for a non-reactive read
- `canUndo`, `canRedo` — `computed()` signals
- `getNode(id)` / `getParent(id)` / `getPath(id)` — read the current tree without creating a history entry
- `addNode(parentId, spec, index)` — normalizes `spec` into a node, inserts it under `parentId` (or at the root when `parentId` is `null`) at `index` (or appended), and returns the created node (or `null` if `parentId` doesn't resolve)
- `removeNode(id)`, `updateProps(id, patch)` — `patch` keys set to `undefined` delete that prop
- `setBinding(id, propKey, binding)` — binds a prop to a signal; `binding` is `{ ref, expr? }` (`ref` must be a valid JS identifier) or `null` to clear the binding
- `moveNode(id, newParentId, index)` — refuses to move a node into itself or one of its own descendants
- `duplicateNode(id)` — deep-clones a node (assigning fresh ids) and inserts the copy right after the original
- `select(id)`, `hoverNode(id)` — update the `selection`/`hover` signals and emit a `select`/`hover` event
- `undo()`, `redo()` — return `false` when there is nothing to undo/redo
- `clear()` — empties the tree (recorded as an undoable step)
- `toJSON()` / `fromJSON(json)` — serialize/restore the tree (`fromJSON` resets history and selection)
- `subscribe(callback)` — registers a listener for `{ type, ... }` events (`add`, `remove`, `update`, `binding`, `move`, `select`, `hover`, `undo`, `redo`, `clear`, `load`); returns an unsubscribe function

---

### Palette

#### createPalette()

Creates an empty, mutable registry of component definitions.

**Parameters:** none

**Returns:** a palette object:
- `register(spec)` — adds a definition; `spec.type` is required, `label`/`category`/`tag` default to `type`, `container` defaults to `false`, `props` is an array of `{ name, kind, label?, options?, default? }` field descriptors, `defaults` seeds initial prop values
- `unregister(type)`
- `get(type)` — returns the definition or `null`
- `list()` — all definitions
- `byCategory(category)`
- `categories()` — distinct category names
- `search(query)` — case-insensitive match against type, label, and category

---

#### defaultPalette()

Builds a `createPalette()` instance pre-registered with BaseNative's standard component set: `section`, `stack`, `grid`, `heading`, `text`, `button`, `input`, `textarea`, `checkbox`, `label`, `form`, `link`, `image`, and `signal-text`, grouped into the `layout`, `text`, `inputs`, `navigation`, `media`, and `reactive` categories.

**Parameters:** none

**Returns:** a palette object (same shape as `createPalette()`).

---

### Code Generation

#### generateBaseNative(state, options = {})

Renders a builder state's tree to a BaseNative HTML string.

**Parameters:**
- `state` — a builder state from `createBuilderState`
- `options.indent` — indent string per depth level; default `'  '`
- `options.document` — when `true`, wraps the output in a full `<!DOCTYPE html>` document; default `false`
- `options.title` — `<title>` text, used only when `options.document` is `true`; default `'BaseNative Page'`
- `options.signals` — object mapping signal names to initial values; emitted as a `<script type="module">` block that imports `signal` from `@basenative/runtime` and declares `const name = signal(value)` for each entry
- `options.palette` — a palette (from `createPalette`/`defaultPalette`) used to resolve each node's tag, `role`, and container-ness; without it, `node.type` is used directly as the tag name

**Returns:** an HTML string. Prop bindings render as `{{ expr }}` text interpolation, `:attr="expr"` for bound attributes, or `@bind="ref"` for bound `value`/`checked` on `input`/`textarea`/`select`. Text and attribute values are passed through `escapeHtml`/`escapeAttr`; an invalid (non-identifier) signal `ref` throws.

---

### Rendering Helpers

These render server-side HTML strings for the builder's panels; they back `renderTreeView`, `renderInspector`, and `renderPaletteHTML`'s counterpart custom elements but can be called directly for custom SSR.

#### renderTreeView(state)

Renders an accessible `<ul role="tree">` layer list for the current tree, marking the selected and hovered rows.

**Parameters:**
- `state` — a builder state from `createBuilderState`

**Returns:** HTML string (an empty-state message when the tree has no nodes).

---

#### renderInspector(state, palette)

Renders a property-editing form (`<aside class="bn-inspector">`) for the currently selected node, based on its palette definition's `props`.

**Parameters:**
- `state` — a builder state
- `palette` — a palette used to look up the selected node's prop definitions

**Returns:** HTML string. Field markup depends on each prop's `kind` (`string`, `number`, `boolean`, `enum`, `signal`); an empty-state message is returned when nothing is selected, the node no longer exists, or it has no editable props.

---

#### renderPaletteHTML(palette)

Renders the draggable/clickable component palette panel, grouped by category.

**Parameters:**
- `palette` — a palette from `createPalette`/`defaultPalette`

**Returns:** HTML string.

---

#### renderNodeToElement(doc, node, palette)

Builds a live DOM element (not a string) for a single node, recursing into its children. Used internally by `BnBuilderCanvas` to render the editable canvas.

**Parameters:**
- `doc` — a `Document` to create elements with (e.g. the global `document`)
- `node` — a node from the builder tree
- `palette` — used to resolve the node's tag, `role`, and defaults

**Returns:** an `HTMLElement` with `data-bn-node`/`data-bn-type` set, ready to insert into the DOM.

---

### Escaping Utilities

#### escapeHtml(value)

Escapes `&`, `<`, `>`, `"`, and `'` for safe inclusion in HTML text or attribute content. `null`/`undefined` render as an empty string.

**Parameters:**
- `value` — any value; coerced with `String()`

**Returns:** the escaped string.

---

#### escapeAttr(value)

Alias for `escapeHtml`, used at attribute-value call sites for readability.

**Parameters:**
- `value` — any value

**Returns:** the escaped string.

---

#### isValidIdentifier(name)

Tests whether `name` is a valid JavaScript identifier (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`). Used before emitting a signal `ref` into generated code or a bound attribute, so a malformed ref throws early instead of producing broken output.

**Parameters:**
- `name` — value to test

**Returns:** `boolean`.

---

### Custom Elements

Registering any of these (or importing `@basenative/builder`'s entry point, which imports all of them) defines the corresponding custom element if it isn't already defined.

#### BnBuilder

`<bn-builder>` — the top-level editor. On connect it creates a default `createBuilderState()`/`defaultPalette()` (unless `attach()` was called first), mounts the palette/canvas/inspector/tree layout, and wires the toolbar (Undo, Redo, Clear, Export Code).

- `attach({ state, palette })` — supply an existing state and/or palette instead of the defaults
- `generateCode(options)` — shorthand for `generateBaseNative(this.state, { palette: this.palette, ...options })`
- Fires `bn-builder-export` (`CustomEvent<{ code: string }>`) when "Export Code" is clicked

---

#### BnBuilderCanvas

`<bn-builder-canvas>` — the live, editable drop surface. Re-renders reactively (via `effect()`) whenever the attached state's tree, selection, or hover signal changes.

- `attach(state, palette)`
- Click to select, hover to preview; drag components in from `BnBuilderPalette` or reorder/reparent existing nodes by dragging them onto a container
- `Delete`/`Backspace` removes the selected node; `Ctrl/Cmd+Z` undoes; `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` redoes

---

#### BnBuilderPalette

`<bn-builder-palette>` — the draggable component picker, rendered with `renderPaletteHTML`.

- `attach(palette)`
- Dragging or clicking/pressing Enter/Space on an item dispatches `bn-palette-add` (`CustomEvent<{ type: string, def: object }>`), which `BnBuilder` listens for to insert the new node

---

#### BnBuilderTree

`<bn-builder-tree>` — the accessible layer list, rendered with `renderTreeView`.

- `attach(state)`
- Click a row to select it, hover to preview it on the canvas

---

#### BnBuilderInspector

`<bn-builder-inspector>` — the property editor, rendered with `renderInspector`.

- `attach(state, palette)`
- Editing a field calls `state.updateProps` (coercing the raw input value per the prop's `kind`) or `state.setBinding` for signal-bound fields; the footer's Duplicate/Remove buttons call `state.duplicateNode`/`state.removeNode`

## Integration

`createBuilderState` depends on `signal`/`computed`/`batch` from `@basenative/runtime`, and `BnBuilderCanvas`/`BnBuilderTree`/`BnBuilderInspector` use `effect()` from the same package to stay in sync with state changes — `@basenative/runtime` is a direct dependency, not just a peer convention. `generateBaseNative`'s output is plain BaseNative HTML, suitable for saving as a template or feeding into `@basenative/server` for SSR.

## License

Apache-2.0
