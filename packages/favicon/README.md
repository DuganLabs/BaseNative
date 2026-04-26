# @basenative/favicon

> SVG-first favicon generator + design primitives for every DuganLabs project.

`@basenative/favicon` is the BaseNative answer to "yet another generic favicon." It produces a polished, distinct SVG mark for any project — plus the supporting `apple-touch-icon`, `maskable`, web app manifest, and the **right** `<link>` tags to drop into `<head>`. Pure SVG primary; PNG only when iOS or Android need it.

```bash
pnpm add -D @basenative/favicon
# Optional — only needed for PNG fallbacks (apple-touch-icon, maskable):
pnpm add -D @basenative/og-image
```

## The brand rule: SVG primary, raster only when iOS demands it

Every modern browser (Chrome, Edge, Firefox, Safari ≥ 16) renders `<link rel="icon" type="image/svg+xml">` natively, including in browser tabs. Use it. Save the PNG churn for the platforms that genuinely require it:

- **`favicon.svg`** — the primary, served to every browser.
- **`apple-touch-icon.png` (180×180)** — iOS home-screen.
- **`icon-192.png` / `icon-512.png`** — Android Chrome.
- **`maskable.png` (512×512)** — Android adaptive icons (with the 80% safe zone baked in).
- **`favicon.ico`** — optional belt-and-suspenders for very old browsers; we don't generate it but the `<head>` snippet references it as an alternate.

## `<head>` snippet

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="mask-icon" href="/favicon.svg" color="#0C0B09">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0C0B09">
```

You don't need to memorize any of that — `htmlTags()` and `defineFavicon().htmlTags()` emit the strings for you.

## CLI

```bash
# Interactive — picks a preset, writes public/favicon.svg + manifest + (optional) PNGs.
bn-favicon init

# Non-interactive, idempotent (asks before overwriting unless --force):
bn-favicon init --preset tabs --out public

# Render a preset to stdout:
bn-favicon render basenative > public/favicon.svg

# Print the recommended <head> tags:
bn-favicon html --theme-color "#0C0B09"

# List presets:
bn-favicon list
```

If you have `@basenative/og-image` installed, `init` also writes `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `maskable.png`. Without it, you get the SVG-only set — which is fine for most sites until you decide you care about iOS home-screen icons.

## Programmatic API

```js
import { defineFavicon } from "@basenative/favicon";

const fav = defineFavicon({
  glyph: { kind: "monogram", text: "T", weight: 900, accentDot: true },
  palette: { bg: "#0C0B09", fg: "#FFF3E0", accent: "#E8920A" },
  shape: "rounded",
});

fav.svg;          // <svg>…</svg> — primary asset
fav.apple;        // square variant (no rounding) for iOS rasterization
fav.maskable;     // 80% safe-zone variant for Android adaptive icons
fav.htmlTags();   // string[] — drop into <head>
fav.manifest({ name: "T4BS", themeColor: "#0C0B09" });   // JSON
```

You can also pass a preset name directly:

```js
defineFavicon("basenative");   // → uses the BaseNative house mark
```

## Presets

Eight DuganLabs projects ship pre-built. Use them, fork them, or roll your own.

| Preset            | Glyph                       | Shape    | Accent    |
| ----------------- | --------------------------- | -------- | --------- |
| `tabs`            | monogram **T** + accent dot | rounded  | `#E8920A` |
| `basenative`      | sigil — concentric triangles| rounded  | `#E8920A` |
| `duganlabs`       | monogram **DL**             | shield   | `#E8920A` |
| `pendingbusiness` | symbol — clock              | rounded  | `#4EAF7C` |
| `greenput`        | symbol — leaf               | circle   | `#4EAF7C` |
| `warrendugan`     | monogram **W** / **D** stack| squircle | `#E8920A` |
| `ralph-station`   | sigil — station mark        | diamond  | `#5EA0E8` |
| `warren-sys`      | symbol — terminal prompt    | square   | `#66E0A0` |

Every preset is rendered to a static SVG under `templates/favicons/<preset>.svg` so you can `cp` directly into your `public/` if you don't want to install the runtime:

```bash
cp node_modules/@basenative/favicon/templates/favicons/tabs.svg public/favicon.svg
```

## Designing a new preset

A preset is just an object:

```js
export const myproject = {
  name: "myproject",
  description: "A one-line description for CLI help",
  glyph: { kind: "monogram", text: "MP", weight: 900, letterSpacing: -28 },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#E8920A" },
  shape: "rounded",
  themeColor: "#0C0B09",
};
```

The recipe — three knobs:

1. **Glyph kind**
   - `monogram` — 1-3 letters. Knobs: `text`, `weight`, `letterSpacing`, `stack`, `accentDot`.
   - `symbol` — pick from the curated set: `lightbulb`, `leaf`, `bolt`, `key`, `eye`, `asterisk`, `gear`, `terminal-prompt`, `calendar`, `beaker`, `clock`, `anchor`.
   - `sigil` — abstract marks: `concentric-square`, `intersecting-circles`, `hex-grid`, `signal-stack`, `station-mark`.
   - `wordmark` — short word (≤ 8 chars) in a heavy condensed face.

2. **Palette** — pass `{ bg, fg, accent }`, or a single hex (treated as the accent, paired with the house charcoal). The `fg` is auto-derived from the `bg` luminance if omitted.

3. **Shape** — `square`, `rounded`, `circle`, `squircle`, `shield`, or `diamond`. The shape clip-paths the glyph, so you can drop a square monogram into a `circle` shape and the corners get trimmed cleanly.

### Test it at 16×16

The whole point is to look great as a browser tab favicon. Render the SVG into a `<link rel="icon">` and look at the tab. If it reads as a solid blob, simplify — fewer strokes, more contrast.

## Modules

| Path                              | What it is                                           |
| --------------------------------- | ---------------------------------------------------- |
| `@basenative/favicon`             | Public API: `defineFavicon`, `htmlTags`, `presets`.  |
| `@basenative/favicon/render`      | `renderFaviconSvg`, `shape`, maskable + apple variants. |
| `@basenative/favicon/glyphs`      | Glyph library — `monogram`, `symbol`, `sigil`, `wordmark`. |
| `@basenative/favicon/palette`     | Color helpers — `resolvePalette`, `mix`, `luminance`. |
| `@basenative/favicon/manifest`    | Web App Manifest builder.                            |
| `@basenative/favicon/png`         | Optional PNG rasterizer (peer: `@basenative/og-image`). |
| `@basenative/favicon/presets`     | DuganLabs preset map.                                |

## License

Apache-2.0 © DuganLabs. Built with BaseNative — basenative.dev.
