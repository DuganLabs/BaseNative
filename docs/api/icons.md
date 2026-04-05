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
| `check.svg` | Checkmark |
| `chevron-down.svg` | Down chevron (dropdown indicator) |
| `minus.svg` | Minus / remove |
| `plus.svg` | Plus / add |
| `remove.svg` | X / close |

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

This package ships a minimal set. For a full icon library, consider:
- [Heroicons](https://heroicons.com/) — MIT licensed
- [Lucide](https://lucide.dev/) — ISC licensed
- [Phosphor](https://phosphoricons.com/) — MIT licensed

## License

Apache-2.0
