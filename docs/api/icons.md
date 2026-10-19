# @basenative/icons

> Minimal SVG icon set for BaseNative applications

## Overview

`@basenative/icons` ships a small set of essential SVG icons as individual files. Inline them directly in HTML templates or load them as strings server-side. No icon font, no sprite sheet — just clean inline SVG.

## Installation

```bash
npm install @basenative/icons
```

## Available Icons

| File | Icon |
|------|------|
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

## Usage

### Inline in HTML templates

```html
<button aria-label="Add item">
  <img src="/icons/plus.svg" alt="" aria-hidden="true" width="16" height="16">
</button>
```

### Server-side inline SVG

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';

const checkIcon = readFileSync(
  new URL('../../node_modules/@basenative/icons/src/check.svg', import.meta.url),
  'utf-8'
);

const html = render('<span>{{ icon }}</span>', { icon: checkIcon });
```

### With esbuild/bundler

```js
import checkSvg from '@basenative/icons/src/check.svg?raw';
```

## Styling

Icons are sized via `width`/`height` attributes or CSS. They inherit `currentColor` for stroke/fill where applicable, making them themeable:

```css
.icon {
  width: 1em;
  height: 1em;
  color: currentColor;
}
```

## Adding Icons

This package ships a core set — the glyphs product UI reaches for daily. For a full icon library, consider:
- [Heroicons](https://heroicons.com/) — MIT licensed
- [Lucide](https://lucide.dev/) — ISC licensed
- [Phosphor](https://phosphoricons.com/) — MIT licensed

## License

Apache-2.0
