# @basenative/favicon

> SVG-first favicon generator + design primitives — apple-touch-icon, maskable, manifest, and the right `<link>` tags for every DuganLabs project.

## Overview

`@basenative/favicon` treats SVG as the primary favicon asset: every modern browser (Chrome, Edge, Firefox, Safari ≥16) renders `<link rel="icon" type="image/svg+xml">` natively, including in the browser tab itself. The package is a set of pure, synchronous, dependency-free functions that compose a background `shape` with a foreground `glyph` (a monogram, symbol, wordmark, or sigil) and a three-color `palette` into a complete `<svg>` document, plus a Web App Manifest builder and the `<head>` tag list to wire it all up. PNG rasterization (for iOS home-screen icons and Android maskable/adaptive icons, which cannot be SVG) is available separately via `toPng` / `toIconSet`, which lazily load the `@resvg/resvg-wasm` optional dependency — a local WASM rasterizer, not a network service, so nothing in this package makes outbound calls. A `bn-favicon` CLI binary (`packages/favicon/src/cli.js`) wraps this same API for command-line use; this reference covers the importable module API only.

The package is split across several import subpaths so consumers can pull in only what they need:

| Subpath | File | Contents |
| --- | --- | --- |
| `@basenative/favicon` | `src/index.js` | `defineFavicon`, `htmlTags`, default export, plus re-exports of everything below except the individual named presets and PNG helpers |
| `@basenative/favicon/render` | `src/render.js` | SVG document renderers and the `shape` primitive |
| `@basenative/favicon/glyphs` | `src/glyphs.js` | Glyph library (`monogram`, `symbol`, `sigil`, `wordmark`) |
| `@basenative/favicon/palette` | `src/palette.js` | Color helpers |
| `@basenative/favicon/manifest` | `src/manifest.js` | Web App Manifest builder |
| `@basenative/favicon/presets` | `src/presets/dl.js` | DuganLabs project presets |
| `@basenative/favicon/png` | `src/png.js` | Optional PNG rasterization |

Everything from `render`, `glyphs`, `palette`, and `manifest` is also re-exported from the root `.` entry point for convenience, so `import { renderFaviconSvg } from '@basenative/favicon'` and `import { renderFaviconSvg } from '@basenative/favicon/render'` are the same function. The individual named presets (`tabs`, `basenative`, etc.) and the PNG helpers (`toPng`, `toIconSet`) are **not** re-exported from the root — import those from `/presets` and `/png` respectively.

## Installation

```bash
npm install @basenative/favicon
```

PNG output additionally requires the optional dependency:

```bash
npm install -D @resvg/resvg-wasm
```

## Quick Start

```js
import { defineFavicon } from '@basenative/favicon';

// From a built-in DuganLabs preset:
const favicon = defineFavicon('basenative');

favicon.svg;                 // complete <svg>...</svg> string, 1024×1024 viewBox
favicon.apple;                // apple-touch-icon variant (square, no rounding)
favicon.maskable;             // Android maskable variant (80% safe zone)
favicon.htmlTags().join('\n'); // <link>/<meta> tags for <head>
favicon.manifest({ name: 'BaseNative' }); // manifest.json text

// From a custom spec:
const custom = defineFavicon({
  glyph: { kind: 'monogram', text: 'BN', weight: 800, accentDot: true },
  palette: { bg: '#0C0B09', fg: '#F0EDE4', accent: '#E8920A' },
  shape: 'rounded',
});
```

## API Reference

### Core — `@basenative/favicon`

#### defineFavicon(input)

Turn a favicon spec (or the string name of a registered DuganLabs preset) into a ready-to-ship bundle: rendered SVGs plus a preconfigured `htmlTags` and `manifest` helper.

**Parameters:**
- `input` — a full `FaviconSpec` object (`{ glyph, palette?, shape?, themeColor?, ariaLabel? }`), a preset object from `presets`, or a preset name string (e.g. `'basenative'`)

**Returns:** an object:
```js
{
  spec,                              // the resolved input spec
  svg,                                // renderFaviconSvg(spec) output
  apple,                              // renderAppleSvg(spec) output
  maskable,                           // renderMaskableSvg(spec) output
  htmlTags: (opts) => string[],       // htmlTags() pre-seeded with this spec's themeColor
  manifest: (opts) => string,         // manifestJson() pre-seeded with themeColor + backgroundColor
}
```

Throws if given an unrecognized preset name, naming the available presets in the error message.

---

#### htmlTags(opts = {})

Build the recommended `<link>` / `<meta>` tags for a favicon. The output is an array of strings — one tag per line — so consumers can `.join('\n')` for a server-rendered `<head>` or `.join('')` in a Worker template.

**Parameters:**
- `opts.themeColor` — default `'#0C0B09'` (the DuganLabs house charcoal)
- `opts.manifestHref` — default `'/manifest.json'`
- `opts.appleHref` — default `'/apple-touch-icon.png'`
- `opts.svgHref` — default `'/favicon.svg'`
- `opts.maskIconColor` — color for the Safari pinned-tab mask icon; default is `opts.themeColor`

**Returns:** `string[]` — six tags: SVG icon, `favicon.ico` fallback, apple-touch-icon, Safari mask-icon, manifest link, and the `theme-color` meta tag.

**Example:**
```js
import { htmlTags } from '@basenative/favicon';

const tags = htmlTags({ themeColor: '#0F0E0C' }).join('\n');
```

---

#### Default export

`src/index.js` also has a default export bundling the most-reached-for functions, for consumers who prefer a single namespace import:

```js
import favicon from '@basenative/favicon';

favicon.defineFavicon('basenative');
favicon.htmlTags();
favicon.presets.basenative;
favicon.presetList;
favicon.renderFaviconSvg(spec);
favicon.buildManifest(opts);
```

It is a plain object — `{ defineFavicon, htmlTags, presets, presetList, renderFaviconSvg, buildManifest }` — not a class or factory.

### Rendering — `@basenative/favicon/render`

All renderers are synchronous and return plain strings — no DOM, no canvas.

#### renderFaviconSvg(spec)

Render a complete favicon SVG document: viewBox `0 0 1024 1024`, the resolved `shape` as the background body, and the `glyph` clipped to that body.

**Parameters:**
- `spec.glyph` — `{ kind: 'monogram'|'symbol'|'wordmark'|'sigil', ...glyphOptions }` (required)
- `spec.palette` — a hex string or partial `{ bg, fg, accent }`; resolved via `resolvePalette`
- `spec.shape` — one of `square`, `rounded` (default), `circle`, `squircle`, `shield`, `diamond`
- `spec.ariaLabel` — default `'Favicon'`

**Returns:** `string` — a complete `<svg>...</svg>` document, safe to write directly as `favicon.svg` and serve with `Content-Type: image/svg+xml`.

---

#### renderMaskableSvg(spec)

Render the Android maskable/adaptive-icon variant. The shape is forced to `square` (maskable icons must fill the entire canvas — Android applies its own mask), and the glyph is scaled to 80% and centered, satisfying Android's required safe zone. Output is still a 1024×1024 `<svg>`.

**Parameters:** same `spec` shape as `renderFaviconSvg`; `spec.shape` is ignored.

**Returns:** `string`.

---

#### renderAppleSvg(spec)

Render the apple-touch-icon variant: a plain, non-transparent `square` (no rounded corners — iOS rounds them itself), at the same glyph scale as the normal favicon (unlike `renderMaskableSvg`, it does *not* apply the 80% safe-zone scaling). Internally this is `renderFaviconSvg({ ...spec, shape: 'square' })`. 180×180 is the canonical raster size; the SVG itself is still emitted at 1024×1024 for the consumer to rasterize down.

**Parameters:** same `spec` shape as `renderFaviconSvg`; `spec.shape` is ignored.

**Returns:** `string`.

---

#### shape(name, palette)

Draw the background "shape" — a clipped colored body sized to the viewBox, engineered to look correct when the browser downsamples it to 16×16 in a tab.

**Parameters:**
- `name` — one of `square`, `rounded`, `circle`, `squircle`, `shield`, `diamond`
- `palette` — resolved `{ bg, fg, accent }`

**Returns:** `{ body: string, clipId: string, clipPath: string }` — `body` is the fill shape markup, `clipPath`/`clipId` are used by the renderer to clip glyph overflow (important for `circle`/`shield`/`diamond`, where a square glyph would otherwise poke out at the corners).

Throws on an unrecognized shape name.

### Glyphs — `@basenative/favicon/glyphs`

Every glyph function returns a string of inner SVG markup (no `<svg>` wrapper), sized to the 1024×1024 viewBox and centered so it composes with any `shape`. Glyphs use `palette.fg` for lettering/strokes and `palette.accent` for the mark itself; they never paint their own background.

#### renderGlyph(kind, spec, palette)

Dispatch a glyph by `kind`. This is what `renderFaviconSvg` calls internally; most consumers won't need to call it directly.

**Parameters:**
- `kind` — one of `monogram`, `symbol`, `wordmark`, `sigil`
- `spec` — glyph options (see below, shape depends on `kind`)
- `palette` — resolved `{ bg, fg, accent }`

**Returns:** `string`. Throws on an unrecognized `kind`.

---

#### monogram(spec, palette)

Draws 1-3 letters in a tight, geometric face, sized automatically for legibility at 16px (1 letter renders largest, 3 letters smallest).

**Parameters:**
- `spec.text` — the letters to draw; truncated to 3 characters
- `spec.weight` — font weight; default `800`
- `spec.letterSpacing` — default `-24`
- `spec.stack` — when `true` and `text` is exactly 2 characters, stacks the letters in two rows instead of side by side
- `spec.accentDot` — when `true`, adds a small accent-colored dot in the lower right (the "tab indicator" trick)

**Returns:** `string`.

---

#### symbol(spec, palette)

Symbol glyph entry point — looks up `spec.symbol` in the `symbols` table and draws it.

**Parameters:**
- `spec.symbol` — a key of `symbols`; default `'asterisk'`

**Returns:** `string`. Throws if `spec.symbol` isn't a known key.

---

#### sigil(spec, palette)

Sigil glyph entry point — looks up `spec.sigil` in the `sigils` table and draws it.

**Parameters:**
- `spec.sigil` — a key of `sigils`; default `'concentric-square'`

**Returns:** `string`. Throws if `spec.sigil` isn't a known key.

---

#### wordmark(spec, palette)

Draws a short word (`spec.word` or `spec.text`, truncated to 8 characters) in a single line, with the font size estimated to fit within the 1024-wide canvas.

**Parameters:**
- `spec.word` (or `spec.text` as a fallback)

**Returns:** `string`.

---

#### symbols

`Record<SymbolName, (palette) => string>` — the hand-tuned vector symbol library backing `symbol()`. Available names: `lightbulb`, `leaf`, `bolt`, `key`, `eye`, `asterisk`, `gear`, `terminal-prompt`, `calendar`, `beaker`, `clock`, `anchor`.

---

#### sigils

`Record<SigilName, (palette) => string>` — the hand-tuned abstract sigil library backing `sigil()`. Available names: `concentric-square`, `intersecting-circles`, `hex-grid`, `signal-stack`, `station-mark`.

### Palette — `@basenative/favicon/palette`

#### resolvePalette(input)

Resolve a palette input to a fully-populated `{ bg, fg, accent }`, used internally by every renderer.

**Parameters:**
- `input` — either a hex string (treated as the `accent`, paired with the DuganLabs house `bg` and an auto-contrasted `fg`), or a partial `{ bg, fg, accent }` object (missing fields fall back to `housePalette`, with `fg` auto-derived from `bg`'s luminance when `bg` is given but `fg` isn't)

**Returns:** `{ bg: string, fg: string, accent: string }`.

---

#### hexToRgb(hex)

Parse a `#rgb` or `#rrggbb` hex string to `[r, g, b]` (0-255 each).

**Returns:** `[number, number, number] | null` — `null` on malformed input.

---

#### rgbToHex([r, g, b])

Encode an `[r, g, b]` triple back to a lowercase `#rrggbb` string. Component values are clamped to `0-255` and rounded.

**Returns:** `string`.

---

#### luminance(hex)

Relative luminance per WCAG (0 = black, 1 = white). Used internally to pick a contrasting `fg` when only `bg` is supplied.

**Returns:** `number`.

---

#### mix(a, b, t)

Linearly mix two hex colors.

**Parameters:**
- `a`, `b` — hex color strings
- `t` — mix factor, clamped to `0-1`; `0` returns `a`, `1` returns `b`

**Returns:** `string` (hex).

---

#### housePalette

The default DuganLabs palette constant: `{ bg: '#0C0B09', fg: '#F0EDE4', accent: '#E8920A' }` (charcoal / bone / amber). This is the fallback `resolvePalette` fills gaps from when no preset or custom palette overrides it.

### Manifest — `@basenative/favicon/manifest`

#### buildManifest(opts)

Build a Web App Manifest object referencing the icon files this package's CLI/consumers emit (`favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable.png`).

**Parameters:**
- `opts.name` — app name (required)
- `opts.shortName` — default `opts.name`
- `opts.description`
- `opts.themeColor` — required
- `opts.backgroundColor` — default `opts.themeColor`
- `opts.startUrl` — default `'/'`
- `opts.scope` — default `'/'`
- `opts.display` — one of `standalone` (default), `minimal-ui`, `fullscreen`, `browser`
- `opts.iconBaseUrl` — base path prepended to each icon `src`; default `'/'`. Trailing slashes are stripped before a single `/` is appended.

**Returns:** a plain manifest object (`name`, `short_name`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, `icons: [...]`).

---

#### manifestJson(opts)

`buildManifest(opts)`, stringified as pretty-printed JSON with a trailing newline — ready to write to `public/manifest.json`.

**Parameters:** same as `buildManifest`.

**Returns:** `string`.

### Presets — `@basenative/favicon/presets`

Pre-built favicon definitions for every DuganLabs project, each a `{ name, displayName, description, glyph, palette, shape, themeColor }` record. Pass the preset object (or its string name) to `defineFavicon`.

#### presets

`Record<string, Preset>` map keyed by preset name — use `presets[name]` for table-driven dispatch. This is also re-exported from the root `.` entry point. Keys: `tabs`, `basenative`, `duganlabs`, `pendingbusiness`, `greenput`, `warrendugan`, `ralph-station`, `warren-sys` (note the last two keys are hyphenated even though their JS binding names, below, are camelCase).

---

#### presetList

`Preset[]` — the same presets as an ordered array, handy for building help/CLI output. Also re-exported from the root `.` entry point.

---

#### Individual presets

Each of the following is an individually named `Preset` export, importable only from `@basenative/favicon/presets` (not re-exported from the root):

- `tabs` — T4BS, "5 Things in 4 Tabs" word game (monogram "T", rounded)
- `basenative` — the org's foundation framework (signal-stack sigil, rounded)
- `duganlabs` — the org mark (monogram "DL", shield)
- `pendingbusiness` — task/pending-action tracker (clock symbol, rounded)
- `greenput` — sustainability/green-tech home (leaf symbol, circle)
- `warrendugan` — warrendugan.com personal site (stacked monogram "WD", squircle)
- `ralphStation` — Ralph Station, fixed point/signal station (`name: 'ralph-station'`; station-mark sigil, diamond)
- `warrenSys` — warren.sys, terminal-flavored personal system (`name: 'warren-sys'`; terminal-prompt symbol, square)

### PNG — `@basenative/favicon/png` (optional)

Requires the optional dependency `@resvg/resvg-wasm`, loaded lazily on first call so the SVG-only path stays dependency-free. If it isn't installed, both functions reject with a single clear error naming the package and the install command, rather than a raw module-resolution error.

#### toPng(svg, size = 512)

Rasterize an SVG string to PNG bytes at the requested square size.

**Parameters:**
- `svg` — an SVG string (e.g. from `renderFaviconSvg`)
- `size` — output edge length in pixels; default `512`. Common sizes: `180` for `apple-touch-icon.png`, `192` for Android Chrome's `icon-192.png`, `512` for `icon-512.png`/`maskable.png`

**Returns:** `Promise<Uint8Array>` — PNG byte buffer.

---

#### toIconSet({ favicon, maskable })

Convenience wrapper that rasterizes the canonical icon set in one call.

**Parameters:**
- `favicon` — SVG string from `renderFaviconSvg` (or `renderAppleSvg`)
- `maskable` — SVG string from `renderMaskableSvg`

**Returns:** `Promise<Record<string, Uint8Array>>` — a map with keys `apple-touch-icon.png` (180px, from `favicon`), `icon-192.png` (192px, from `favicon`), `icon-512.png` (512px, from `favicon`), and `maskable.png` (512px, from `maskable`), ready to write under `public/`.

**Example:**
```js
import { defineFavicon } from '@basenative/favicon';
import { toIconSet } from '@basenative/favicon/png';

const favicon = defineFavicon('greenput');
const pngs = await toIconSet({ favicon: favicon.svg, maskable: favicon.maskable });
// pngs['apple-touch-icon.png'], pngs['icon-192.png'], pngs['icon-512.png'], pngs['maskable.png']
```

## Integration

`htmlTags()` and `defineFavicon(...).htmlTags()` return strings meant to be joined directly into a `@basenative/server` SSR `<head>` template or a Cloudflare Worker HTML template literal. `manifestJson()` / `defineFavicon(...).manifest()` output is meant to be served verbatim as `public/manifest.json`, referenced by the `manifest` link tag `htmlTags()` emits. The `png` subpath's optional dependency (`@resvg/resvg-wasm`) is intentionally isolated from `@basenative/og-image`, which pins the same resvg version independently — the two packages must not depend on each other for it.

## License

Apache-2.0
