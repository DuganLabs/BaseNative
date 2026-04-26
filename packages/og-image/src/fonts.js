// Built with BaseNative — basenative.dev
/**
 * Font loader for OG renders.
 *
 * Pulls woff files from the immutable jsdelivr `@fontsource/*` CDN, then
 * caches them in a KV namespace (configurable binding name, default
 * `OG_CACHE`). Module-scoped maps keep the buffers in memory for the life
 * of the isolate — KV is only hit on cold start.
 *
 * If no cache binding is provided we fall back to fetching every cold
 * isolate and emit a `console.warn` so the operator notices.
 *
 * @module
 */

/** @typedef {{ name: string, data: ArrayBuffer, weight: number, style: "normal" | "italic" }} SatoriFont */

/** @typedef {{ family?: string, weights?: number[], cdnVersion?: string, cacheBinding?: string, cacheKeyPrefix?: string }} FontConfig */

const DEFAULT_FAMILY = "Inter";
const DEFAULT_WEIGHTS = [600, 700, 800];
const DEFAULT_CDN_VERSION = "5.0.16";
const DEFAULT_CACHE_BINDING = "OG_CACHE";
const DEFAULT_CACHE_KEY_PREFIX = "font:";

// Module-scoped cache: family-weight → ArrayBuffer.
// Survives across requests on a warm isolate; cold isolates start empty.
/** @type {Map<string, ArrayBuffer>} */
const _memo = new Map();

/**
 * Build a jsdelivr URL for an `@fontsource` weight file.
 *
 * @param {string} family
 * @param {number} weight
 * @param {string} version
 * @returns {string}
 */
function fontUrl(family, weight, version) {
  const slug = family.toLowerCase().replace(/\s+/g, "-");
  return `https://cdn.jsdelivr.net/npm/@fontsource/${slug}@${version}/files/${slug}-latin-${weight}-normal.woff`;
}

/**
 * Define a font configuration. Returned object is consumed by `loadFonts`.
 *
 * @param {FontConfig} [cfg]
 * @returns {Required<FontConfig>}
 */
export function defineFonts(cfg = {}) {
  return {
    family: cfg.family ?? DEFAULT_FAMILY,
    weights: cfg.weights ?? DEFAULT_WEIGHTS,
    cdnVersion: cfg.cdnVersion ?? DEFAULT_CDN_VERSION,
    cacheBinding: cfg.cacheBinding ?? DEFAULT_CACHE_BINDING,
    cacheKeyPrefix: cfg.cacheKeyPrefix ?? DEFAULT_CACHE_KEY_PREFIX,
  };
}

/**
 * Fetch a binary asset, going through KV → upstream CDN, with module-memo.
 *
 * @param {Record<string, any>} env Worker env binding map.
 * @param {string} cacheBinding KV binding name.
 * @param {string} cacheKey
 * @param {string} url
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchAndCache(env, cacheBinding, cacheKey, url) {
  if (_memo.has(cacheKey)) return /** @type {ArrayBuffer} */ (_memo.get(cacheKey));

  const cache = env && env[cacheBinding];
  if (cache && typeof cache.get === "function") {
    const cached = await cache.get(cacheKey, "arrayBuffer");
    if (cached) {
      _memo.set(cacheKey, cached);
      return cached;
    }
  } else {
    // No KV binding — fetch every cold start. Loud, on purpose.
    console.warn(
      `[basenative/og-image] no '${cacheBinding}' KV binding on env; ` +
        `font ${cacheKey} will be re-fetched on every cold isolate.`,
    );
  }

  const r = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) throw new Error(`og-asset-fetch-failed: ${cacheKey} ${r.status}`);
  const buf = await r.arrayBuffer();

  if (cache && typeof cache.put === "function") {
    // Long TTL — these are immutable URLs.
    await cache.put(cacheKey, buf, { expirationTtl: 60 * 60 * 24 * 365 });
  }

  _memo.set(cacheKey, buf);
  return buf;
}

/**
 * Load the configured fonts and return them in satori's expected shape.
 *
 * @param {Record<string, any>} env Worker env (must contain the KV binding).
 * @param {Required<FontConfig>} cfg Resolved font config from `defineFonts`.
 * @returns {Promise<SatoriFont[]>}
 */
export async function loadFonts(env, cfg) {
  const { family, weights, cdnVersion, cacheBinding, cacheKeyPrefix } = cfg;
  const out = await Promise.all(
    weights.map(async (weight) => {
      const key = `${cacheKeyPrefix}${family.toLowerCase().replace(/\s+/g, "-")}-${weight}`;
      const data = await fetchAndCache(env, cacheBinding, key, fontUrl(family, weight, cdnVersion));
      return /** @type {SatoriFont} */ ({ name: family, data, weight, style: "normal" });
    }),
  );
  return out;
}

/**
 * Test hook: clear the in-memory font memoization. Not part of the public API.
 *
 * @returns {void}
 */
export function _resetFontsForTest() {
  _memo.clear();
}
