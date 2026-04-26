// Built with BaseNative — basenative.dev
/**
 * Web App Manifest emitter. Spits out a JSON object suitable for writing to
 * `public/manifest.json` and linking from `<head>` via
 * `<link rel="manifest" href="/manifest.json">`.
 *
 * The manifest references the icon files this package emits — `favicon.svg`,
 * `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable.png` —
 * and supplies the platform metadata browsers need to render install prompts
 * and home-screen tiles.
 *
 * @module
 */

/** @typedef {{
 *   name: string,
 *   shortName?: string,
 *   description?: string,
 *   themeColor: string,
 *   backgroundColor?: string,
 *   startUrl?: string,
 *   display?: "standalone"|"minimal-ui"|"fullscreen"|"browser",
 *   scope?: string,
 *   iconBaseUrl?: string,
 * }} ManifestOpts */

/**
 * Build a Web App Manifest object.
 *
 * @param {ManifestOpts} opts
 * @returns {Record<string, any>}
 */
export function buildManifest(opts) {
  const base = (opts.iconBaseUrl || "/").replace(/\/+$/, "") + "/";
  return {
    name: opts.name,
    short_name: opts.shortName || opts.name,
    description: opts.description || undefined,
    start_url: opts.startUrl || "/",
    scope: opts.scope || "/",
    display: opts.display || "standalone",
    theme_color: opts.themeColor,
    background_color: opts.backgroundColor || opts.themeColor,
    icons: [
      {
        src: `${base}favicon.svg`,
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: `${base}apple-touch-icon.png`,
        type: "image/png",
        sizes: "180x180",
        purpose: "any",
      },
      {
        src: `${base}icon-192.png`,
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: `${base}icon-512.png`,
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: `${base}maskable.png`,
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}

/**
 * Stringify a manifest into pretty-printed JSON, with a trailing newline.
 *
 * @param {ManifestOpts} opts
 * @returns {string}
 */
export function manifestJson(opts) {
  return JSON.stringify(buildManifest(opts), null, 2) + "\n";
}
