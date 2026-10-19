# @basenative/icons

> Minimal SVG icon set for BaseNative UI components

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/icons
```

## Quick Start

```js
// Inline an SVG icon in a server-rendered template
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function icon(name) {
  return readFileSync(
    join(__dirname, 'node_modules/@basenative/icons/src', `${name}.svg`),
    'utf-8'
  );
}

const html = `
  <button type="button">
    ${icon('plus')} Add item
  </button>
`;
```

## With @basenative/server

```js
import { render } from '@basenative/server';
import { readFileSync } from 'node:fs';

const plusIcon = readFileSync('./node_modules/@basenative/icons/src/plus.svg', 'utf-8');

const html = render('<button>{{ icon }} Add</button>', { icon: plusIcon });
```

## Available Icons

Icons live in `src/` as plain `.svg` files. Each SVG is sized for inline use and inherits `currentColor`.

| File | Description |
|------|-------------|
| `activity.svg` | Pulse / activity feed |
| `bar-chart.svg` | Bar chart / reports |
| `calendar.svg` | Calendar / scheduled jobs |
| `check.svg` | Checkmark / confirmation |
| `chevron-down.svg` | Downward chevron for dropdowns |
| `chevron-left.svg` | Left chevron / back |
| `chevron-right.svg` | Right chevron / forward |
| `clock.svg` | Clock / time |
| `dashboard.svg` | Dashboard grid / today view |
| `file-text.svg` | Document / estimate |
| `mail.svg` | Envelope / email |
| `map-pin.svg` | Location pin |
| `megaphone.svg` | Megaphone / campaigns |
| `menu.svg` | Hamburger menu |
| `message-square.svg` | Chat bubble with message lines |
| `minus.svg` | Minus / remove / collapse |
| `package.svg` | Box / inventory |
| `phone.svg` | Telephone handset |
| `plug.svg` | Plug / plugins and integrations |
| `plus.svg` | Plus / add / expand |
| `remove.svg` | X / close / dismiss |
| `search.svg` | Magnifying glass / search |
| `settings.svg` | Gear / settings |
| `shield.svg` | Shield / trust and protection |
| `star.svg` | Star / reviews and ratings |
| `trending-up.svg` | Rising chart / opportunities |
| `truck.svg` | Truck / vehicles |
| `user-plus.svg` | Person with plus / new lead |
| `users.svg` | People / customers |

## Styling

Icons inherit `color` from their parent element via `currentColor` and scale with `em`/`font-size`. Apply classes or inline width/height to control size:

```css
.icon { width: 1em; height: 1em; vertical-align: middle; }
```

## License

Apache-2.0
