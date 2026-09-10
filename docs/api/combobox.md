# @basenative/combobox

> Accessible combobox primitive — typeahead input that filters an existing list and lets the user create a new entry, implementing the WAI-ARIA APG combobox + listbox pattern.

## Overview

`@basenative/combobox` renders a text input paired with a filtered popup listbox: type to filter an existing option list, arrow through matches, and optionally commit a value that doesn't exist yet as a new "create" entry. It follows the SSR-then-hydrate split used across BaseNative: `renderCombobox` produces a plain HTML string (the listbox starts `hidden`, so the widget degrades to a plain text input plus a `<datalist>` fallback with no JavaScript), and `hydrateCombobox` wires up filtering, keyboard navigation, ARIA virtual focus, and signal interop against that same markup. `Combobox` is a one-shot convenience that bundles both steps. The listbox is positioned `absolute` and only shown while expanded, so opening and closing it never causes layout shift.

A stylesheet for the default markup is available at either `@basenative/combobox/css` or `@basenative/combobox/styles.css` (both resolve to the same file).

## Installation

```bash
npm install @basenative/combobox
```

## Quick Start

```js
import { Combobox } from '@basenative/combobox';

const cb = Combobox({
  id: 'category',
  name: 'category',
  label: 'Category',
  options: ['Books', 'Electronics', 'Garden', { value: 'other', label: 'Other', hint: 'Custom' }],
  allowCreate: true,
  onChange(value) { console.log('selected', value); },
  onCreate(label) { console.log('create', label); },
});

container.innerHTML = cb.html;
const handle = cb.hydrate(container.querySelector('[data-bn="combobox"]'));

// later
handle.destroy();
```

For SSR-only output with hydration wired up separately:

```js
import { renderCombobox, hydrateCombobox } from '@basenative/combobox';

const html = renderCombobox({ id: 'tag', label: 'Tag', options: ['red', 'green', 'blue'] });
// ...serve `html`...

// on the client, after the markup above is in the DOM:
const handle = hydrateCombobox(document.getElementById('tag'), {
  options: ['red', 'green', 'blue'],
  onChange(value) { /* ... */ },
});
```

## API Reference

### Combobox(options = {})

One-shot convenience over `renderCombobox` and `hydrateCombobox`. Returns `{ html, hydrate }` so callers can embed the markup in SSR output and wire reactivity later — `hydrate(rootEl)` calls `hydrateCombobox(rootEl, options)` with the same `options` object passed to `Combobox`.

**Parameters:** same shape as `renderCombobox`/`hydrateCombobox` (see below).

**Returns:** `{ html: string, hydrate(rootEl): ReturnType<hydrateCombobox> }`

---

### renderCombobox(options = {})

Render the combobox as an HTML string — pre-paint friendly and usable with no JavaScript (the `<input>` still submits its value as a normal form field). The static markup includes:

- root `<div data-bn="combobox" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="{listId}">`
- `<label for="{id}-input">` (only when `label` is provided)
- `<input data-bn="cb-input" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="{listId}" aria-describedby="{liveId}">`
- `<button data-bn="cb-toggle" tabindex="-1" aria-hidden="true">` — the dropdown-arrow affordance
- `<ul data-bn="cb-listbox" role="listbox" hidden>` — populated and unhidden by `hydrateCombobox`
- `<datalist>` mirroring the options, as a no-JS fallback for the bare `<input>`
- `<span data-bn="cb-live" aria-live="polite" aria-atomic="true">` — screen-reader announcement region

**Parameters:**
- `options.id` — base id for generated element ids; random if omitted
- `options.name` — `name` attribute on the `<input>`
- `options.label` — label text; also becomes the listbox's `aria-label`
- `options.placeholder` — `<input>` placeholder text
- `options.value` — initial value; accepts a plain string, a signal accessor function, or `{ get() }`
- `options.options` — array of raw options (strings or `{ value, label, hint? }`), normalized via `normalizeOption`
- `options.allowCreate` — boolean; reflected as `data-allow-create` on the root
- `options.theme` — written as `data-theme` on the root
- `options.ariaDescribedBy` — extra id(s) appended to the input's `aria-describedby`, alongside the live region's id

**Returns:** HTML string.

---

### hydrateCombobox(rootEl, options = {})

Hydrate a rendered combobox. `rootEl` is the element produced by `renderCombobox` (or any DOM that follows the same `data-bn` contract: a `[data-bn="cb-input"]` input and a `[data-bn="cb-listbox"]` list are required; a `[data-bn="cb-toggle"]` button is optional). Throws a `TypeError` if `rootEl` is not an element, and an `Error` if the required child parts are missing.

**Parameters:**
- `rootEl` — the combobox root DOM element
- `options.options` — array of raw options (strings or `{ value, label, hint? }`)
- `options.value` — initial selection; string or signal accessor
- `options.onChange(value)` — called when an existing option is selected
- `options.onCreate(label)` — called when a non-matching value is committed with `allowCreate` on; if omitted and `allowCreate` is set, `onChange` is called with the typed label instead
- `options.allowCreate` — boolean; shows a `+ Create "…"` entry for non-matching, non-empty queries
- `options.createLabel(input)` — function returning the create-option's display label; defaults to `` `+ Create "${input}"` ``
- `options.filter(option, query)` — custom filter predicate; defaults to `defaultFilter`
- `options.label` — used for the ARIA wiring applied via `applyAriaAttributes`
- `options.runtime` — optional `{ effect }` (e.g. a BaseNative runtime) used to keep the input's displayed value in sync with a signal `value`; without it, `value` is read once at hydrate time

**Returns:** a handle object:
- `destroy()` — removes all event listeners bound during hydration
- `refresh()` — re-renders the listbox content against the current input value, if open
- `open()` / `close()` — force the popup open or closed
- `setOptions(next)` — replace the option list (normalized the same way as `options.options`) and re-render if open

**Keyboard behavior implemented in the hydrated widget:**
- `ArrowDown` / `ArrowUp` — open the popup if closed and activate the first/last option; otherwise move the active option, wrapping around
- `Home` / `End` (while open) — jump to the first/last option
- `Enter` (while open) — commit the active option, or the create entry; with no active row, an exact label match is committed, else (if `allowCreate`) the typed text is committed as a new entry
- `Escape` (while open) — close the popup
- `Tab` (while open) — commits the active option first (if any), then lets focus move on
- Typing does not itself move the active option (per WAI-ARIA APG, `renderList` resets `activeIndex` to `-1` on every re-render) — the active option only changes via the arrow/Home/End keys above

Activation uses `aria-activedescendant` on the input (virtual focus) rather than moving real DOM focus into the listbox, so the on-screen keyboard on mobile browsers stays open while navigating options.

---

### normalizeOption(raw)

Lift a raw option (a string, or `{ value, label, hint? }`) into a normalized shape. Strings become `{ value: s, label: s }`. Non-string, non-object, or `null`/`undefined` input returns `null` (dropped by callers that `.filter(Boolean)`).

**Parameters:**
- `raw` — a string, or an object with `value`, `label` (optional; defaults to `value`), `hint` (optional), and `disabled` (optional boolean)

**Returns:** `{ value: string, label: string, hint?: string, disabled?: true } | null`

---

### defaultFilter(option, query)

Case-insensitive substring match against the option's label, value, and hint concatenated together. Empty (or whitespace-only) queries match every option, which is why the listbox shows the full option list on focus.

**Parameters:**
- `option` — a normalized option
- `query` — raw user input string

**Returns:** `boolean`

---

### prefixFilter(option, query)

Case-insensitive prefix match against the option's label only (value and hint are not considered). Best for short option lists where predictable typeahead ordering matters more than matching on value/hint.

**Parameters:**
- `option` — a normalized option
- `query` — raw user input string

**Returns:** `boolean`

---

### fuzzyFilter(option, query)

Lightweight in-order subsequence matcher: every character of `query` must appear, in order and case-insensitively, somewhere in the option's label. There is no relevance scoring — matching options keep the order they were passed in.

**Parameters:**
- `option` — a normalized option
- `query` — raw user input string

**Returns:** `boolean`

---

### applyAriaAttributes(rootEl, options = {})

Idempotently apply the widget's ARIA wiring to a combobox root, its input, and its listbox — safe to call again after a re-render or during hydration. No-ops if `rootEl` isn't an element or the expected `[data-bn="cb-input"]`/`[data-bn="cb-listbox"]` children aren't found.

Attributes it sets: `role="combobox"`, `aria-haspopup="listbox"`, and `aria-expanded` on the root; `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, and `aria-controls` (pointing at the listbox's `id`) on the input, plus `aria-label` if `options.label` is given and the input has none already; `role="listbox"` (and `aria-label`, if given) on the listbox.

**Parameters:**
- `rootEl` — the combobox root element
- `options.expanded` — boolean; reflected into the `aria-expanded` attributes
- `options.label` — optional accessible label applied to the input/listbox

**Returns:** `undefined`

---

### escapeOnKeydown(rootEl, onEscape)

Bind an `Escape` keydown handler at the given root, scoped to that widget, so `Escape` can close the popup from anywhere inside it. Returns an unbind function.

**Parameters:**
- `rootEl` — element to attach the `keydown` listener to
- `onEscape` — called with the keyboard event when `Escape` is pressed

**Returns:** `() => void` — call to remove the listener. Returns a no-op function if `rootEl` doesn't support `addEventListener`.

---

### announce(rootEl, message)

Announce a transient message to screen readers via the widget's `aria-live="polite"` region (`[data-bn="cb-live"]`). Used internally by `hydrateCombobox` for "N options available" / `Press Enter to create "…"` / "Selected …" hints. Idempotent — clears the region's text first (via `queueMicrotask`, when available) so the same message announced twice is still read out both times.

**Parameters:**
- `rootEl` — the combobox root element containing the live region
- `message` — the string to announce

**Returns:** `undefined`

## License

Apache-2.0
