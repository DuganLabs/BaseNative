// Built with BaseNative — basenative.dev
/**
 * DuganLabs preset library — pre-built favicon definitions for every
 * project in the org. Each preset is a `{ name, glyph, palette, shape,
 * themeColor, description }` record consumed by `defineFavicon()` or by
 * the `bn-favicon render <preset>` CLI command.
 *
 * Adding a new preset:
 *   1. Pick a glyph kind — `monogram` | `symbol` | `wordmark` | `sigil`.
 *   2. Pick a palette — usually a single accent on the DuganLabs charcoal.
 *   3. Pick a shape — `square` | `rounded` | `circle` | `squircle` |
 *      `shield` | `diamond`. Match the project's wider visual identity.
 *   4. Add a 1-line description (it shows up in `bn-favicon` help output).
 *
 * @module
 */

/** @typedef {import("../render.js").FaviconSpec & {
 *   name: string,
 *   description: string,
 *   themeColor: string,
 * }} Preset */

/** @type {Preset} */
export const tabs = {
  name: "tabs",
  description: "T4BS — '5 Things in 4 Tabs' word game",
  glyph: { kind: "monogram", text: "T", weight: 900, accentDot: true },
  palette: { bg: "#0C0B09", fg: "#FFF3E0", accent: "#E8920A" },
  shape: "rounded",
  themeColor: "#0C0B09",
};

/** @type {Preset} */
export const basenative = {
  name: "basenative",
  description: "BaseNative — the org's foundation framework",
  glyph: { kind: "sigil", sigil: "signal-stack" },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#E8920A" },
  shape: "rounded",
  themeColor: "#0C0B09",
};

/** @type {Preset} */
export const duganlabs = {
  name: "duganlabs",
  description: "DuganLabs — the org mark",
  glyph: { kind: "monogram", text: "DL", weight: 900, letterSpacing: -36 },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#E8920A" },
  shape: "shield",
  themeColor: "#0C0B09",
};

/** @type {Preset} */
export const pendingbusiness = {
  name: "pendingbusiness",
  description: "PendingBusiness — task / pending-action tracker",
  glyph: { kind: "symbol", symbol: "clock" },
  palette: { bg: "#0F0E0C", fg: "#F0EDE4", accent: "#4EAF7C" },
  shape: "rounded",
  themeColor: "#0F0E0C",
};

/** @type {Preset} */
export const greenput = {
  name: "greenput",
  description: "Greenput — sustainability + green-tech home",
  glyph: { kind: "symbol", symbol: "leaf" },
  palette: { bg: "#0F0E0C", fg: "#F0EDE4", accent: "#4EAF7C" },
  shape: "circle",
  themeColor: "#0F0E0C",
};

/** @type {Preset} */
export const warrendugan = {
  name: "warrendugan",
  description: "warrendugan.com — personal site",
  glyph: { kind: "monogram", text: "WD", weight: 900, stack: true },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#E8920A" },
  shape: "squircle",
  themeColor: "#0C0B09",
};

/** @type {Preset} */
export const ralphStation = {
  name: "ralph-station",
  description: "Ralph Station — fixed point / signal station",
  glyph: { kind: "sigil", sigil: "station-mark" },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#5EA0E8" },
  shape: "diamond",
  themeColor: "#0C0B09",
};

/** @type {Preset} */
export const warrenSys = {
  name: "warren-sys",
  description: "warren.sys — terminal-flavored personal system",
  glyph: { kind: "symbol", symbol: "terminal-prompt" },
  palette: { bg: "#0C0B09", fg: "#F0EDE4", accent: "#66E0A0" },
  shape: "square",
  themeColor: "#0C0B09",
};

/** Full preset map keyed by name. Use `presets[name]` for table-driven dispatch. */
/** @type {Record<string, Preset>} */
export const presets = {
  tabs,
  basenative,
  duganlabs,
  pendingbusiness,
  greenput,
  warrendugan,
  "ralph-station": ralphStation,
  "warren-sys": warrenSys,
};

/** Ordered preset list — handy for help output. */
export const presetList = [
  tabs,
  basenative,
  duganlabs,
  pendingbusiness,
  greenput,
  warrendugan,
  ralphStation,
  warrenSys,
];
