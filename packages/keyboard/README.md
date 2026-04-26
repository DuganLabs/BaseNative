# @basenative/keyboard

> Accessible, mobile-first on-screen virtual keyboard primitive — layout-agnostic, signal-driven, themable.

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem.

Built for puzzle games, kiosk apps, accessible inputs, and any time you need an on-screen keyboard that doesn't fight with mobile Safari.

## Why

Mobile browsers have a lot of opinions about keyboards. The native one pops up uninvited, focus jumps around, hit targets are too small, animations break for users who asked them not to. This package is a single primitive that:

- Renders semantic `<button>` elements (works without JS — SSR pre-paint friendly).
- Dispatches taps via signal-aware handlers, with hardware-key mirroring so a Bluetooth keyboard goes through the exact same dispatch path.
- Applies per-key status classes from a `state` getter (`green` / `yellow` / `absent` / `staked`) — perfect for Wordle-style games or any feedback-driven UI.
- Themes entirely through `--kb-*` CSS custom properties. No bundled palette assumptions.
- Has 44pt min hit targets by default (WCAG 2.5.5 AA), default-palette WCAG AA contrast on every status state, and honors `prefers-reduced-motion`.
- Fixes the mobile-Safari focus-steal bug (more on this below).

## Install

```bash
pnpm add @basenative/keyboard @basenative/runtime
```

## Quick start — game keyboard

```js
import { Keyboard, LAYOUTS } from '@basenative/keyboard';
import { signal, effect } from '@basenative/runtime';
import '@basenative/keyboard/css';

const keyStatus = signal({ A: 'green', E: 'yellow', X: 'absent' });

const kb = Keyboard({
  layout: LAYOUTS.qwerty,
  primary: 'ENTER',
  state: keyStatus.get,
  runtime: { effect },
  onKey:    (char) => guessSignal.update(g => g + char),
  onAction: (a) => {
    if (a === 'ENTER') submitGuess();
    if (a === 'BACKSPACE') guessSignal.update(g => g.slice(0, -1));
  },
});

document.querySelector('#kb-mount').innerHTML = kb.html;
kb.hydrate(document.querySelector('[data-bn="keyboard"]'));
```

## Numpad

```js
import { Keyboard } from '@basenative/keyboard';

const pad = Keyboard({
  layout: 'numpad',
  primary: 'ENTER',
  onKey: (digit) => pin.update(s => s + digit),
  onAction: (a) => a === 'BACKSPACE' && pin.update(s => s.slice(0, -1)),
});
```

## Custom layout

```js
import { defineLayout, Keyboard } from '@basenative/keyboard';

const dvorak = defineLayout([
  ['1','2','3','4','5','6','7','8','9','0'],
  ["'", ',', '.', 'P', 'Y', 'F', 'G', 'C', 'R', 'L'],
  ['A', 'O', 'E', 'U', 'I', 'D', 'H', 'T', 'N', 'S'],
  [
    { type: 'action', label: '⌫', key: 'BACKSPACE', span: 1.5, variant: 'backspace' },
    ';', 'Q', 'J', 'K', 'X', 'B', 'M', 'W', 'V', 'Z',
    { type: 'action', label: 'GO', key: 'ENTER', span: 1.5, variant: 'enter' },
  ],
]);

const kb = Keyboard({ layout: dvorak, primary: 'ENTER', onKey, onAction });
```

## Theming

All visuals are CSS custom properties. Override at any ancestor:

```css
.my-app [data-bn="keyboard"] {
  --kb-bg: #fff;
  --kb-key-bg: #f4f4f5;
  --kb-key-fg: #18181b;
  --kb-key-active: #d4d4d8;
  --kb-key-green:  #16a34a;
  --kb-key-yellow: #eab308;
  --kb-key-absent: #d4d4d8;
  --kb-key-radius: 8px;
  --kb-min-tap: 48px;
}
```

| Token              | Purpose                                  | Default      |
| ------------------ | ---------------------------------------- | ------------ |
| `--kb-bg`          | Keyboard surface background              | `#0C0B09`    |
| `--kb-key-bg`      | Default key background                   | `#3A3530`    |
| `--kb-key-fg`      | Default key text                         | `#F0EDE4`    |
| `--kb-key-active`  | Pressed-state background                 | `#5A5550`    |
| `--kb-key-green`   | Status: correct position                 | `#2E8B5A`    |
| `--kb-key-yellow`  | Status: correct letter, wrong position   | `#D4B445`    |
| `--kb-key-absent`  | Status: not in answer                    | `#1E1C18`    |
| `--kb-key-radius`  | Per-key corner radius                    | `6px`        |
| `--kb-gap`         | Horizontal gap between keys              | `4px`        |
| `--kb-min-tap`     | Minimum hit target (WCAG 2.5.5 AA)       | `44px`       |

## Mobile Safari focus fix

When you tap a key, mobile Safari briefly moves focus to the `<button>`, which blurs the active text input. That blur causes Safari to dismiss the keyboard — and on the next focus, it raises the *native* keyboard alongside ours. The fix is to call `preventDefault` on `mousedown` / `touchstart` so focus never moves at all.

`hydrateKeyboard` does this automatically. If you ever need a key that *does* take focus (rare — usually a key that submits a form via native semantics), set `data-bn-kb-focusable="true"` on the button.

## Hardware keyboard parity

When `bindHardware` is `true` (default), `keydown` events on `document` are translated into the same `onKey` / `onAction` calls as taps. So a Bluetooth keyboard or a desktop user gets identical behavior — no separate input pipeline.

To restrict the chars the hardware listener forwards, pass a `charSet` via the lower-level `bindHardwareKeys(...)` API.

## Mobile testing notes

- iOS 16/17 Safari (iPhone 12, 14 Pro, SE 3rd gen): tap dispatch, no native-keyboard pop-up, haptics fire.
- Android 13/14 Chrome (Pixel 6, 7): tap dispatch, `navigator.vibrate(8)` fires, hit targets pass Lighthouse a11y audit.
- Reduced-motion: tested with iOS "Reduce Motion" and `prefers-reduced-motion: reduce` in DevTools — press scale animation drops to a flat color change.

## API

```ts
import {
  Keyboard,            // factory: { html, hydrate(rootEl) }
  renderKeyboard,      // SSR: returns HTML string
  hydrateKeyboard,     // wire reactivity to an existing root
  LAYOUTS,             // { qwerty, alphanumeric, numpad, phone }
  defineLayout,        // (rows, meta?) => Layout
  validateLayout,      // throw on shape mismatch
  keyState,            // single-letter status reader
  applyAriaAttributes,
  preventFocusSteal,
  bindHardwareKeys,
  haptic,
} from '@basenative/keyboard';
```

See `types/index.d.ts` for full signatures.

## License

Apache-2.0
