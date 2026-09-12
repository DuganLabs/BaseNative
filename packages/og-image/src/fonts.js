// Built with BaseNative — basenative.dev
/**
 * Font loading for OG renders.
 *
 * Two render paths want two different *formats*, and getting that wrong is
 * silent, so it is explicit here:
 *
 *  - **`ttf`** — for the rasterizer path (`renderSvg` / `renderCard`).
 *    `@resvg/resvg-wasm`'s bundled `fontdb` only understands raw sfnt
 *    (TrueType/OpenType). Hand it a `.woff` and it does not error: it loads no
 *    faces and draws **no glyphs at all**, so you get a correctly sized card
 *    with the text missing. That is why this path does not use `@fontsource`,
 *    whose modern releases publish only `.woff`/`.woff2` — verified, 2026-09:
 *    `@fontsource/inter@5.2.8/files/inter-latin-700-normal.woff` begins
 *    `wOFF`. It uses `@expo-google-fonts/*` instead, which publishes the
 *    upstream Google Fonts TTFs at immutable npm versions (magic `00010000`,
 *    same check).
 *  - **`woff`** — for the satori path (`@basenative/og-image/satori`). satori
 *    decompresses WOFF itself, and the smaller files are worth it there.
 *
 * Caching, cheapest first: a module-scoped map (free, per isolate) → a KV
 * namespace if one is bound (shared across isolates and colos) → the CDN, with
 * `cf.cacheEverything` so Cloudflare's own edge cache absorbs the miss even
 * when no KV binding exists. Pass `cacheBinding: null` to say "no KV on
 * purpose" and suppress the warning.
 *
 * @module
 */

import { OgImageError } from "./errors.js";

/** @typedef {{ name: string, data: ArrayBuffer, weight: number, style: "normal" | "italic" }} SatoriFont */

/** @typedef {"ttf" | "woff"} FontFormat */

/** @typedef {{
 *   family?: string,
 *   weights?: number[],
 *   format?: FontFormat,
 *   cdnVersion?: string,
 *   cacheBinding?: string | null,
 *   cacheKeyPrefix?: string,
 *   buffers?: Record<number, ArrayBuffer | Uint8Array>,
 *   urls?: Record<number, string>,
 * }} FontConfig */

const DEFAULT_FAMILY = "Inter";
const DEFAULT_CACHE_BINDING = "OG_CACHE";
const DEFAULT_CACHE_KEY_PREFIX = "font:";

/** Weights the card layouts actually ask for; keeping the default tight keeps
 *  the cold-start fetch to two files. */
const DEFAULT_TTF_WEIGHTS = [600, 800];
const DEFAULT_WOFF_WEIGHTS = [600, 700, 800];

const DEFAULT_TTF_VERSION = "0.2.3"; // @expo-google-fonts/* — immutable
const DEFAULT_WOFF_VERSION = "5.0.16"; // @fontsource/* — immutable

/**
 * TTF registry: `@expo-google-fonts/<slug>` file names by weight. Families not
 * listed here are still reachable — pass `urls` with your own per-weight URLs.
 *
 * @type {Record<string, Record<number, string>>}
 */
const TTF_FILES = {
  inter: {
    100: "Inter_100Thin.ttf",
    200: "Inter_200ExtraLight.ttf",
    300: "Inter_300Light.ttf",
    400: "Inter_400Regular.ttf",
    500: "Inter_500Medium.ttf",
    600: "Inter_600SemiBold.ttf",
    700: "Inter_700Bold.ttf",
    800: "Inter_800ExtraBold.ttf",
    900: "Inter_900Black.ttf",
  },
};

/**
 * @param {string} family
 * @returns {string}
 */
function slugify(family) {
  return String(family).toLowerCase().replace(/\s+/g, "-");
}

/**
 * Build the CDN URL for one family/weight/format.
 *
 * @param {Required<Pick<FontConfig, "family" | "format" | "cdnVersion">>} cfg
 * @param {number} weight
 * @returns {string}
 */
export function fontUrl(cfg, weight) {
  const slug = slugify(cfg.family);
  if (cfg.format === "woff") {
    return `https://cdn.jsdelivr.net/npm/@fontsource/${slug}@${cfg.cdnVersion}/files/${slug}-latin-${weight}-normal.woff`;
  }
  const files = TTF_FILES[slug];
  const file = files && files[weight];
  if (!file) {
    throw new OgImageError(
      "font-fetch-failed",
      `No TTF known for ${cfg.family} weight ${weight}. Supply one with ` +
        `defineFonts({ urls: { ${weight}: "https://…/Font.ttf" } }) or defineFonts({ buffers }).`,
    );
  }
  return `https://cdn.jsdelivr.net/npm/@expo-google-fonts/${slug}@${cfg.cdnVersion}/${file}`;
}

/**
 * Resolve a font configuration. Defaults depend on `format`, because the two
 * formats come from different packages with different version lines.
 *
 * @param {FontConfig} [cfg]
 * @param {FontFormat} [defaultFormat]
 * @returns {Required<Omit<FontConfig, "buffers" | "urls">> & { buffers?: FontConfig["buffers"], urls?: FontConfig["urls"] }}
 */
export function defineFonts(cfg = {}, defaultFormat = "ttf") {
  const format = cfg.format ?? defaultFormat;
  return {
    family: cfg.family ?? DEFAULT_FAMILY,
    weights: cfg.weights ?? (format === "woff" ? DEFAULT_WOFF_WEIGHTS : DEFAULT_TTF_WEIGHTS),
    format,
    cdnVersion: cfg.cdnVersion ?? (format === "woff" ? DEFAULT_WOFF_VERSION : DEFAULT_TTF_VERSION),
    // `undefined` means "use the default binding name"; `null` means "there is
    // deliberately no KV here" and silences the warning.
    cacheBinding: cfg.cacheBinding === undefined ? DEFAULT_CACHE_BINDING : cfg.cacheBinding,
    cacheKeyPrefix: cfg.cacheKeyPrefix ?? DEFAULT_CACHE_KEY_PREFIX,
    buffers: cfg.buffers,
    urls: cfg.urls,
  };
}

// Module-scoped cache: cache key → bytes. Survives across requests on a warm
// isolate; cold isolates start empty.
/** @type {Map<string, ArrayBuffer>} */
const _memo = new Map();

/** Warn about a missing KV binding once per isolate, not once per font. */
let _warnedNoBinding = false;

/**
 * Cache key for one resolved font file.
 *
 * The format and CDN version are part of the key on purpose: without them a
 * `.woff` cached by the satori path would be served to the rasterizer path,
 * which cannot parse it and would draw an empty card — a failure with no error
 * anywhere to find it by.
 *
 * @param {ReturnType<typeof defineFonts>} cfg
 * @param {number} weight
 * @returns {string}
 */
export function fontCacheKey(cfg, weight) {
  return `${cfg.cacheKeyPrefix}${slugify(cfg.family)}-${weight}-${cfg.format}-${cfg.cdnVersion}`;
}

/**
 * Fetch a font file, going module-memo → KV → CDN.
 *
 * @param {Record<string, any>} env
 * @param {ReturnType<typeof defineFonts>} cfg
 * @param {number} weight
 * @returns {Promise<ArrayBuffer>}
 */
async function loadOne(env, cfg, weight) {
  const key = fontCacheKey(cfg, weight);
  const memo = _memo.get(key);
  if (memo) return memo;

  const cache = cfg.cacheBinding ? env && env[cfg.cacheBinding] : null;
  if (cache && typeof cache.get === "function") {
    const cached = await cache.get(key, "arrayBuffer");
    if (cached) {
      _memo.set(key, cached);
      return cached;
    }
  } else if (cfg.cacheBinding && !_warnedNoBinding) {
    _warnedNoBinding = true;
    console.warn(
      `[basenative/og-image] no '${cfg.cacheBinding}' KV binding on env; fonts will be ` +
        `re-fetched on every cold isolate. Bind one, or pass ` +
        `defineFonts({ cacheBinding: null }) to accept that deliberately.`,
    );
  }

  const url = (cfg.urls && cfg.urls[weight]) || fontUrl(cfg, weight);
  // `cacheEverything` puts the response in Cloudflare's own edge cache, which
  // is what makes the no-KV configuration viable rather than merely tolerable.
  const r = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) {
    throw new OgImageError("font-fetch-failed", `og-font-fetch-failed: ${key} ${r.status} ${url}`);
  }
  const buf = await r.arrayBuffer();

  if (cache && typeof cache.put === "function") {
    await cache.put(key, buf, { expirationTtl: 60 * 60 * 24 * 365 });
  }
  _memo.set(key, buf);
  return buf;
}

/**
 * @param {ArrayBuffer | Uint8Array} b
 * @returns {Uint8Array}
 */
function asBytes(b) {
  return b instanceof Uint8Array ? b : new Uint8Array(b);
}

/**
 * Load fonts as raw byte arrays, for the rasterizer.
 *
 * @param {Record<string, any>} env Worker env binding map (may be `{}`).
 * @param {ReturnType<typeof defineFonts>} cfg
 * @returns {Promise<Uint8Array[]>}
 */
export async function loadFontBuffers(env, cfg) {
  const out = await Promise.all(
    cfg.weights.map(async (weight) => {
      const provided = cfg.buffers && cfg.buffers[weight];
      if (provided != null) return asBytes(provided);
      return asBytes(await loadOne(env, cfg, weight));
    }),
  );
  if (out.length === 0) {
    throw new OgImageError(
      "no-fonts",
      "No font weights configured — defineFonts({ weights: [...] }) resolved to an empty list, " +
        "and the rasterizer draws nothing without at least one face.",
    );
  }
  return out;
}

/**
 * Load fonts in satori's descriptor shape.
 *
 * @param {Record<string, any>} env
 * @param {ReturnType<typeof defineFonts>} cfg
 * @returns {Promise<SatoriFont[]>}
 */
export async function loadFonts(env, cfg) {
  return Promise.all(
    cfg.weights.map(async (weight) => {
      const provided = cfg.buffers && cfg.buffers[weight];
      const data = provided != null ? provided : await loadOne(env, cfg, weight);
      return /** @type {SatoriFont} */ ({
        name: cfg.family,
        data,
        weight,
        style: "normal",
      });
    }),
  );
}

/**
 * Test hook: clear the in-memory font memoization. Not part of the public API.
 *
 * @returns {void}
 */
export function _resetFontsForTest() {
  _memo.clear();
  _warnedNoBinding = false;
}
