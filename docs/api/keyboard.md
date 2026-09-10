# @basenative/keyboard

> Accessible mobile-first on-screen virtual keyboard primitive — layout-agnostic, signal-driven key state coloring, themable.

## Overview

`@basenative/keyboard` renders an on-screen keyboard as semantic `<button>` elements from a layout definition — the built-ins `qwerty`, `alphanumeric`, `numpad`, and `phone`, or a custom layout via `defineLayout`. It splits cleanly into an SSR-safe render step (`renderKeyboard`, a pure HTML-string function that works with no JS) and a separate hydrate step (`hydrateKeyboard`, which wires up tap dispatch, hardware-key mirroring, a mobile-Safari focus fix, and per-key state coloring); `Keyboard()` is a one-shot convenience over both. Per-key state coloring (e.g. Wordle-style green/yellow/absent) is driven by a plain `state()` getter you supply — if you also pass a `runtime` object exposing `effect()` (the same shape as `@basenative/runtime`'s `effect()`), key classes re-apply automatically whenever the signal(s) read inside `state()` change. The package itself does not import `@basenative/runtime` — it declares it as an optional peer dependency and works with any object shaped `{ effect(fn) }`, but it's designed around that runtime's reactivity model (see `docs/api/runtime.md` for `signal()`/`effect()`).

## Installation

```bash
npm install @basenative/keyboard
```

Import the stylesheet — `./css` and `./styles.css` both resolve to the same file (`src/styles.css`), a themable, CSS-custom-property-driven stylesheet under `@layer keyboard`:

```js
import '@basenative/keyboard/css';
```

## Quick Start

```js
import { Keyboard } from '@basenative/keyboard';
import { signal, effect } from '@basenative/runtime';

const letterState = signal({}); // e.g. { A: 'green', S: 'absent' }

const kb = Keyboard({
  layout: 'qwerty',
  label: 'Guess keyboard',
  onKey: (char) => appendGuess(char),
  onAction: (action) => {
    if (action === 'ENTER') submitGuess();
    if (action === 'BACKSPACE') deleteGuess();
  },
  state: () => letterState(),
  runtime: { effect },
});

container.innerHTML = kb.html;
const handle = kb.hydrate(container.querySelector('[data-bn="keyboard"]'));
// later: handle.destroy();
```

## API Reference

### Keyboard(options = {})

One-shot convenience. Returns `{ html, hydrate }` so callers can embed the markup in SSR output and wire up reactivity later — `html` is the result of `renderKeyboard(options)`, and calling `hydrate(rootEl)` calls `hydrateKeyboard(rootEl, options)` with the same options.

**Parameters:** the union of `renderKeyboard`'s and `hydrateKeyboard`'s options (see below).

**Returns:** `{ html: string, hydrate(rootEl): { destroy(), refresh() } }`

---

### renderKeyboard(options = {})

Render the keyboard as an HTML string. Pre-paint friendly — works in SSR, hydrates cleanly client-side.

**Parameters:**
- `options.layout` — a layout object, a built-in name (`'qwerty'` default, `'alphanumeric'`, `'numpad'`, `'phone'`), or a raw array of rows (normalized via `normalizeKey`)
- `options.label` — `aria-label` for the root region; default `'On-screen keyboard'`
- `options.primary` — action key name to visually highlight (e.g. `'ENTER'`)
- `options.disabled` — render every key disabled; default `false`
- `options.id` — root element id; auto-generated (`bn-kb-<random>`) if omitted
- `options.theme` — theme name applied as `data-theme` on the root

**Returns:** HTML string, structured as:
```html
<div data-bn="keyboard" id="..." class="bn-kb" role="region" aria-label="..." aria-roledescription="virtual keyboard">
  <div data-bn="kb-rows" class="bn-kb-rows">
    <div data-bn="kb-row" class="bn-kb-row" data-row="0">
      <button type="button" data-bn="kb-key" data-kb-type="char|action" data-kb-key="A" class="bn-kb-key ...">
        <span aria-hidden="true">A</span>
      </button>
      <!-- ... -->
    </div>
  </div>
</div>
```

---

### hydrateKeyboard(rootEl, options = {})

Hydrate a rendered keyboard. `rootEl` is the element produced by `renderKeyboard` (or any equivalent DOM that follows the `data-bn="kb-key"` contract). Throws `TypeError` if `rootEl` isn't a DOM element.

**Parameters:**
- `options.onKey(char, event)` — fired for char keys
- `options.onAction(actionKey, event)` — fired for action keys (`'ENTER'`, `'BACKSPACE'`, ...)
- `options.state` — function returning a map of key → `'green' | 'yellow' | 'present' | 'absent' | 'staked'` (`'present'` is an alias for `'yellow'`, matching t4bs naming); called once on hydrate, and re-run inside `runtime.effect` on every subsequent call if `runtime` is provided
- `options.runtime` — optional `{ effect }`, e.g. `@basenative/runtime`
- `options.bindHardware` — bind a `keydown` listener on `document` mirroring physical keys onto the same dispatch as taps; default `true`
- `options.haptic` — fire `haptic()` on tap; default `true`

Internally binds both `click` and `touchend` handlers (the latter with `preventDefault`) so taps register on iOS Safari, where `preventFocusSteal`'s `touchstart.preventDefault()` would otherwise suppress the synthetic click.

**Returns:** `{ destroy(), refresh() }` — `destroy()` removes all listeners and the hardware-key binding; `refresh()` re-runs the state-class pass on demand.

---

### keyState(stateOrGetter, letter)

Lift a single letter's status out of a state-map signal/getter. Useful when you want to drive a *different* UI element off the same key-status source (e.g. a tile in a Wordle-style grid).

**Parameters:**
- `stateOrGetter` — either a function returning a state map, or a plain state-map object
- `letter` — the key to read

**Returns:** a getter function `() => status | undefined`.

```js
const greenA = keyState(stateGetter, 'A');
if (greenA() === 'green') { /* ... */ }
```

---

### LAYOUTS

Built-in layouts, pre-normalized via `defineLayout`: `qwerty`, `alphanumeric`, `numpad`, `phone`. Each is `{ rows: Key[][], name }`.

---

### defineLayout(rows, meta = {})

Define a custom layout. Validates row shape and returns a layout object usable in `Keyboard({ layout })`.

**Parameters:**
- `rows` — non-empty array of rows, each a non-empty array of `Key`-shapes or strings; strings and partial objects are passed through `normalizeKey`
- `meta` — merged into the returned object (e.g. `{ name }`)

Throws `TypeError` if `rows` isn't a non-empty array, or a row isn't an array.

**Returns:** `{ rows: normalizedRows, name: meta.name ?? 'custom', ...meta }`

---

### validateLayout(layout)

Shape-validate a layout object. Returns `true` or throws with a clear message — handy in tests and dev builds. Checks that `layout.rows` is a non-empty array of non-empty rows, and that every key has `type` of `'char'` or `'action'` with string `label` and `key`.

**Returns:** `true` (throws `TypeError` on the first invalid row/key otherwise)

---

### normalizeKey(raw)

Normalize any user-supplied key shape into a canonical `Key` object. Strings become char keys; partial objects get sensible defaults.

**Parameters:** `raw` — a string, a partial `{ type?, label?, key?, span?, variant? }` object, or anything else (coerced to a string char key)

**Returns:** `{ type: 'char' | 'action', label, key, span, variant? }` — a string `raw` becomes `{ type: 'char', label: raw, key: raw, span: 1 }`; an object defaults `type` to `'char'` unless `'action'`, `label` to `raw.key ?? ''`, `key` to `raw.label`, and `span` to `1` unless a positive number is given.

---

### applyAriaAttributes(rootEl, options = {})

Apply accessible attributes to the root keyboard element: `role="region"`, `aria-label` (default `'On-screen keyboard'`), and `aria-roledescription="virtual keyboard"`. Idempotent — safe to call after re-render or on hydrate. No-ops if `rootEl` isn't a DOM element.

---

### preventFocusSteal(rootEl)

Mobile-Safari focus fix. Without this, tapping a key briefly blurs the active text input, which makes iOS think the user dismissed the field — and on the next focus it re-raises the native keyboard. Swallows `mousedown` and `touchstart` on any `[data-bn-kb-key]` so focus never moves, unless that key opts in with `data-bn-kb-focusable="true"`.

**Returns:** an unbind function that removes both listeners. No-ops (returns a no-op function) if `rootEl` doesn't support `addEventListener`.

---

### bindHardwareKeys(target, handlers, options = {})

Bind a hardware keyboard listener that mirrors physical keys onto the same dispatch pipeline as the on-screen keyboard.

**Parameters:**
- `target` — an event target, e.g. `document`
- `handlers.onKey(char, event)` — fired for single printable characters (uppercased)
- `handlers.onAction(action, event)` — fired for `Enter` → `'ENTER'` and `Backspace` → `'BACKSPACE'`
- `options.charSet` — optional `Set` of allowed uppercase chars; other chars are ignored

Ignores any keydown with `metaKey`, `ctrlKey`, or `altKey` held.

**Returns:** an unbind function. No-ops if `target` doesn't support `addEventListener`.

---

### haptic(ms = 8)

Optional haptic feedback via `navigator.vibrate(ms)`. No-ops where unsupported, and swallows any error.

## Integration

`hydrateKeyboard`'s `state`/`runtime` options are designed around `@basenative/runtime`'s `signal()`/`effect()` model (see `docs/api/runtime.md`): pass a `state` getter that reads a `signal()`, and `runtime: { effect }` (the runtime's own `effect`) so the keyboard's key classes stay in sync automatically whenever that signal changes, without the keyboard package needing to import the runtime directly.

## License

Apache-2.0
