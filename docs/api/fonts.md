# @basenative/fonts

> Pre-bundled web fonts for BaseNative applications

## Overview

`@basenative/fonts` provides a curated set of web fonts as woff2 files plus a single CSS stylesheet. Import the CSS to get Inter (sans-serif), JetBrains Mono (monospace), Source Serif 4 (serif), and DM Serif Display — along with the BaseNative-branded variants.

## Installation

```bash
npm install @basenative/fonts
```

## Usage

### In a CSS file or `<link>` tag

```html
<link rel="stylesheet" href="/node_modules/@basenative/fonts/fonts.css">
```

### In a bundler

```js
import '@basenative/fonts/fonts.css';
```

### Direct woff2 references

The package ships the following font files under `src/`:

| File | Font |
|------|------|
| `inter-latin.woff2` | Inter (variable) — default sans-serif |
| `jetbrains-mono-latin-variable.woff2` | JetBrains Mono — monospace / code |
| `source-serif-4-latin-variable.woff2` | Source Serif 4 — body serif |
| `dm-serif-display-latin.woff2` | DM Serif Display — display serif |
| `BaseNative-Sans.woff2` | BaseNative Sans — branded sans |
| `BaseNative-Serif.woff2` | BaseNative Serif — branded serif |
| `BaseNative-Mono.woff2` | BaseNative Mono — branded mono |

## CSS Custom Properties

After importing `fonts.css`, the following CSS custom properties are available:

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-serif: 'Source Serif 4', Georgia, serif;
  --font-display: 'DM Serif Display', serif;
}
```

These align with `@basenative/components` design tokens.

## Notes

- All fonts use `font-display: swap` for performance
- Variable fonts are used where available for smaller bundle size
- Only Latin character set is included

## License

Apache-2.0
