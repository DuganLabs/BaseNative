# @basenative/combobox

> Accessible typeahead combobox primitive — pick from an existing list, or create a new entry. WAI-ARIA APG combobox+listbox pattern, SSR-first, signal-driven, themable.

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem.

## Why

Most combobox libraries are huge (40+ KB), framework-specific, and ship with opinionated styles you have to fight. This one is the opposite:

- Renders semantic HTML server-side. Without JS, you get a plain `<input>` + `<datalist>` typeahead (good enough for forms).
- With JS, hydrates into a full APG-pattern combobox with virtual focus, keyboard nav, and a built-in "+ Create" affordance.
- Themes entirely through `--cb-*` CSS custom properties. Zero bundled palette assumptions.
- Layout-shift-free: opening the listbox never reflows the page.
- Signal interop via `runtime.effect` — pass a `@basenative/runtime` signal and the input mirrors it.

## Install

```bash
pnpm add @basenative/combobox @basenative/runtime
```

## Quick start — pick from existing options

```js
import { Combobox } from '@basenative/combobox';
import '@basenative/combobox/css';

const cb = Combobox({
  id: 'fruit',
  name: 'fruit',
  label: 'Pick a fruit',
  options: ['Apple', 'Banana', 'Cherry'],
  onChange: (value) => console.log('selected', value),
});

document.querySelector('#mount').innerHTML = cb.html;
const handle = cb.hydrate(document.querySelector('[data-bn="combobox"]'));
```

## Allow creating new entries

```js
const cb = Combobox({
  id: 'tag',
  label: 'Tag',
  options: existingTags,
  allowCreate: true,
  createLabel: (input) => `+ New tag "${input}"`,
  onChange: (value) => setTag(value),
  onCreate: (label) => {
    addTag(label);   // persist somewhere
    setTag(label);
  },
});
```

If you don't pass `onCreate`, BaseNative will treat the user's typed text as the value and call `onChange(typed)`.

## With option hints

Useful for showing keyboard shortcuts, sort metadata, or contextual info inline:

```js
const cb = Combobox({
  options: [
    { value: 'today',     label: 'Today',          hint: 'T' },
    { value: 'this-week', label: 'This week',      hint: 'W' },
    { value: 'all',       label: 'All time',       hint: 'A' },
  ],
  onChange: (v) => setRange(v),
});
```

## Controlled with a signal

```js
import { signal, effect } from '@basenative/runtime';
import { Combobox } from '@basenative/combobox';

const category = signal('books');

const cb = Combobox({
  options: ['books', 'movies', 'music'],
  value: category,            // function-shape signal accessor
  onChange: (v) => category.set(v),
  runtime: { effect },        // mirrors signal -> input on every change
});
```

## ARIA pattern

This package implements the [W3C APG combobox/listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) precisely:

- The input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls=<listbox id>`.
- The popup has `role="listbox"`. Each row has `role="option"` and `aria-selected`.
- Focus stays in the input. Highlighted row is communicated via `aria-activedescendant` (virtual focus).
  - This is essential on mobile: moving real focus into the popup would close the soft keyboard.
- A polite live region (`aria-live="polite"`) announces option count after each filter change, and announces the create-option hint separately so screen-reader users know it's a different action.
- The create-option uses a distinct color token (`--cb-create-fg`) and `data-bn-cb-create="true"` for SR / styling.

### Keyboard

| Key       | Behavior                                                              |
| --------- | --------------------------------------------------------------------- |
| ArrowDown | Open popup (if closed) and move active option down                    |
| ArrowUp   | Open popup (if closed) and move active option up                      |
| Home      | Move active to first option                                           |
| End       | Move active to last option                                            |
| Enter     | Commit the active option (or, with no active row, the typed query)    |
| Escape    | Close popup, leave input value intact                                 |
| Tab       | Commit active option (if any), then move focus per natural tab order  |

Selecting "+ Create" never wipes the user's typed input — the typed text becomes the new value.

## Theming

Override at any ancestor:

```css
.dark [data-bn="combobox"] {
  --cb-bg: #18181b;
  --cb-fg: #f4f4f5;
  --cb-border: #3f3f46;
  --cb-border-focus: #f59e0b;
  --cb-listbox-bg: #18181b;
  --cb-listbox-border: #3f3f46;
  --cb-option-bg-hover: #27272a;
  --cb-option-bg-active: #3f3f46;
  --cb-create-fg: #fbbf24;
  --cb-create-bg: #422006;
}
```

| Token                   | Purpose                                  | Default       |
| ----------------------- | ---------------------------------------- | ------------- |
| `--cb-bg`               | Input field background                   | `#ffffff`     |
| `--cb-fg`               | Default text                             | `#111111`     |
| `--cb-border`           | Field border                             | `#c8c6bf`     |
| `--cb-border-focus`     | Field border on focus                    | `#2E5BFF`     |
| `--cb-radius`           | Field corner radius                      | `6px`         |
| `--cb-input-h`          | Field height                             | `44px`        |
| `--cb-listbox-bg`       | Popup background                         | `#ffffff`     |
| `--cb-listbox-border`   | Popup border                             | `#c8c6bf`     |
| `--cb-option-bg-hover`  | Option hover background                  | `#f1efe9`     |
| `--cb-option-bg-active` | Option active (keyboard) background      | `#e6e4dc`     |
| `--cb-option-fg`        | Option text                              | `#111111`     |
| `--cb-create-fg`        | Create-option text (distinct on purpose) | `#0F5132`     |
| `--cb-create-bg`        | Create-option background                 | `#ECFDF3`     |
| `--cb-min-tap`          | Minimum hit target (WCAG 2.5.5 AA)       | `44px`        |

## Filter strategies

```js
import { Combobox, defaultFilter, prefixFilter, fuzzyFilter } from '@basenative/combobox';

Combobox({ options, filter: prefixFilter });    // type "ap" → "Apple"
Combobox({ options, filter: fuzzyFilter });     // type "apl" → "Apple"
Combobox({ options, filter: (o, q) => o.value.startsWith(q.toUpperCase()) });
```

## Mobile testing notes

- iOS 16/17 Safari: tested on iPhone 12 / 14 Pro. Tapping options doesn't dismiss the soft keyboard (we cancel `mousedown` on the listbox).
- `inputmode="text"` keeps the system keyboard layout text-shaped (not a numpad).
- `font-size: 16px` minimum prevents iOS zoom-on-focus.
- 44pt min hit target on every option.

## API

```ts
import {
  Combobox,            // factory: { html, hydrate(rootEl) }
  renderCombobox,      // SSR: returns HTML string
  hydrateCombobox,     // wire reactivity to an existing root
  normalizeOption,     // (raw) => { value, label, hint? }
  defaultFilter,
  prefixFilter,
  fuzzyFilter,
  applyAriaAttributes,
  escapeOnKeydown,
  announce,
} from '@basenative/combobox';
```

See `types/index.d.ts` for full signatures.

## License

Apache-2.0
