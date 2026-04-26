# @basenative/favicon

## 0.1.0 — initial release.

- `defineFavicon(spec | preset-name)` → `{ svg, apple, maskable, htmlTags(), manifest() }` — single entry-point for the runtime API.
- `htmlTags({ themeColor, svgHref, appleHref, manifestHref, maskIconColor })` — emits the recommended `<link>` / `<meta>` tags for `<head>`. Includes SVG icon, apple-touch-icon, mask-icon, manifest, theme-color.
- Pure SVG renderer (`renderFaviconSvg`, `renderMaskableSvg`, `renderAppleSvg`) — viewBox 1024×1024, no external dependencies.
- Glyph library: `monogram` (1–3 letters with weight / spacing / accent-dot / stacked options), `symbol` (12 hand-tuned vectors — lightbulb, leaf, bolt, key, eye, asterisk, gear, terminal-prompt, calendar, beaker, clock, anchor), `sigil` (5 abstract marks — concentric-square, intersecting-circles, hex-grid, signal-stack, station-mark), `wordmark`.
- Six shape primitives: `square`, `rounded`, `circle`, `squircle`, `shield`, `diamond`. Each shape clip-paths the glyph so it composes cleanly.
- Palette helpers — accept a single hex (treated as the accent, paired with the DuganLabs charcoal) or a full `{ bg, fg, accent }` map. Auto-derives `fg` from `bg` luminance.
- Web App Manifest builder — emits the canonical icon set referencing `favicon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `maskable.png` (with 80% safe zone).
- Optional PNG rasterizer — defers loading `@resvg/resvg-wasm` (via the `@basenative/og-image` peer) so the SVG-only happy path stays dependency-free.
- 8 pre-built DuganLabs presets — `tabs`, `basenative`, `duganlabs`, `pendingbusiness`, `greenput`, `warrendugan`, `ralph-station`, `warren-sys`. Pre-rendered SVGs ship under `templates/favicons/`.
- `bn-favicon` CLI — `init` (interactive, idempotent), `render <preset>`, `html`, `list`. Designed to be invoked from the BaseNative `bn` umbrella as `bn favicon`.
