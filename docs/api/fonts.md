# @basenative/fonts

> The BaseNative design system font family: Sans, Serif, and Mono variants.

## Overview

`@basenative/fonts` ships the `BaseNative` font family in three optical variants (Sans, Serif, and Mono) as prebuilt WOFF2 files with a ready-to-use CSS `@font-face` declaration. All three variants share a single family name and are differentiated by `font-stretch` so you can select them with standard CSS. Fonts use `font-display: swap` and cover the Latin-1 Unicode range.

## Installation

```bash
npm install @basenative/fonts
```

## Quick Start

Import the CSS file in your layout to register the `@font-face` declarations:

```css
@import '@basenative/fonts/fonts.css';
```

Or link it in HTML:

```html
<link rel="stylesheet" href="/node_modules/@basenative/fonts/fonts.css">
```

Then apply the font family:

```css
:root {
  font-family: 'BaseNative', system-ui, sans-serif;
}
```

## Font Variants

All variants share the family name `BaseNative` and weight `400`. Select them using `font-stretch`:

| Variant | `font-stretch` | File |
|---------|---------------|------|
| Sans | `normal` | `BaseNative-Sans.woff2` |
| Serif | `expanded` | `BaseNative-Serif.woff2` |
| Mono | `ultra-condensed` | `BaseNative-Mono.woff2` |

**Example:**
```css
/* Sans (default) */
body {
  font-family: 'BaseNative', system-ui;
  font-stretch: normal;
}

/* Serif for article text */
article {
  font-stretch: expanded;
}

/* Mono for code */
code, pre {
  font-stretch: ultra-condensed;
}
```

## CSS Reference

The `fonts.css` file registers `@font-face` rules for each variant with:
- `font-display: swap` — text remains visible during font load
- `unicode-range` — restricted to Latin-1 and common symbols so fallback fonts handle other scripts
- No subsetting or variable font axes beyond the three optical variants

## Integration

Import `fonts.css` once in your root layout template. No JavaScript is required. The font files are served directly from `node_modules` in development; in production, copy or bundle them alongside your application assets.
