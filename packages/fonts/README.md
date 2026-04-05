# @basenative/fonts

> Self-hosted web fonts for BaseNative projects — Sans, Serif, and Mono variants

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/fonts
```

## Quick Start

```html
<!-- Link the pre-built @font-face stylesheet -->
<link rel="stylesheet" href="node_modules/@basenative/fonts/fonts.css">
```

```css
/* Then use the font families in your CSS */
body {
  font-family: 'BaseNative', sans-serif;    /* Sans (weight 400, normal stretch) */
}

code {
  font-family: 'BaseNative', monospace;     /* Mono (weight 400, ultra-condensed stretch) */
}

blockquote {
  font-family: 'BaseNative', serif;         /* Serif (weight 400, expanded stretch) */
}
```

## Bundler usage

```js
// Import via your bundler (Vite, ESBuild, etc.)
import '@basenative/fonts/fonts.css';
```

## Included Fonts

All fonts are in `.woff2` format and use `font-display: swap` for fast initial paint.

| File | Family | Notes |
|------|--------|-------|
| `BaseNative-Sans.woff2` | `BaseNative` | weight 400, normal stretch |
| `BaseNative-Serif.woff2` | `BaseNative` | weight 400, expanded stretch |
| `BaseNative-Mono.woff2` | `BaseNative` | weight 400, ultra-condensed stretch |
| `inter-latin.woff2` | `Inter` | Variable, Latin subset |
| `source-serif-4-latin-variable.woff2` | `Source Serif 4` | Variable, Latin subset |
| `jetbrains-mono-latin-variable.woff2` | `JetBrains Mono` | Variable, Latin subset |
| `dm-serif-display-latin.woff2` | `DM Serif Display` | Display weight, Latin subset |

## License

MIT
