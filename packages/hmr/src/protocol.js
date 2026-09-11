// Built with BaseNative — basenative.dev
/**
 * Wire protocol shared by the server half (`server.js`, `proxy.js`) and the
 * browser half (`client.js`) of `@basenative/hmr`.
 *
 * This module is isomorphic on purpose: it is imported by Node and *also*
 * served to the browser at `/__bn_hmr/protocol.js`, so the two halves can never
 * disagree about a route or an event name. Keep it free of any `node:` import
 * and any DOM access.
 */

/** URL prefix every HMR route lives under. Chosen to be unlikely to collide. */
export const HMR_BASE = '/__bn_hmr';

/** Absolute routes served by the dev middleware. */
export const ROUTES = {
  client: `${HMR_BASE}/client.js`,
  patch: `${HMR_BASE}/patch.js`,
  preserve: `${HMR_BASE}/preserve.js`,
  protocol: `${HMR_BASE}/protocol.js`,
  stream: `${HMR_BASE}/stream`,
  status: `${HMR_BASE}/status`,
};

/**
 * Attribute stamped on the injected `<script>`. The patcher treats any node
 * carrying it as owned by HMR and never removes it, so a page whose server
 * output does not contain the tag cannot delete the client mid-session.
 */
export const CLIENT_MARKER = 'data-bn-hmr';

/**
 * Opt-out attribute. Children of an element carrying it are left completely
 * alone by the patcher — the escape hatch for custom elements such as
 * `<bn-canvas>` that build their subtree imperatively and own it.
 */
export const SKIP_ATTR = 'data-bn-hmr-skip';

/** Request header the client sends on its re-fetch, so servers can tell it apart. */
export const PATCH_HEADER = 'x-bn-hmr';

/** Kinds of update the server can push. */
export const UPDATE = {
  /** Re-fetch the current URL and patch the live DOM. The default. */
  soft: 'soft',
  /** Only stylesheets changed — swap `<link>` hrefs, do not touch the DOM. */
  style: 'style',
  /** Patching cannot be correct (client-side JS changed): `location.reload()`. */
  hard: 'hard',
};

/** DOM events dispatched on `document` so apps can re-hydrate after a patch. */
export const EVENTS = {
  beforePatch: 'bn:hmr:before-patch',
  patched: 'bn:hmr:patched',
  reload: 'bn:hmr:reload',
};

/**
 * Classify a changed file path into an update kind.
 *
 * - `.css` anywhere            → `style` (hot stylesheet swap, no DOM work)
 * - browser-delivered `.js`    → `hard`  (a patch would leave stale module code)
 * - everything else            → `soft`  (re-render on the server, patch the DOM)
 *
 * "Browser-delivered" means the file sits under a directory a static handler
 * typically serves: `public/`, `static/`, `assets/`, or `client/`.
 *
 * @param {string} file Path of the changed file (any separator).
 * @returns {'soft'|'style'|'hard'}
 */
export function classifyChange(file) {
  const path = String(file ?? '').split('\\').join('/').toLowerCase();
  if (path.endsWith('.css')) return UPDATE.style;
  if (/\.(?:m|c)?js$/.test(path) && /(^|\/)(?:public|static|assets|client)\//.test(path)) {
    return UPDATE.hard;
  }
  return UPDATE.soft;
}

/**
 * Reduce a batch of changed files to the single kind that must be applied.
 * `hard` wins over `soft` wins over `style` — always take the most conservative
 * action the batch demands.
 *
 * @param {string[]} files
 * @returns {'soft'|'style'|'hard'}
 */
export function classifyBatch(files) {
  let kind = UPDATE.style;
  for (const file of files ?? []) {
    const next = classifyChange(file);
    if (next === UPDATE.hard) return UPDATE.hard;
    if (next === UPDATE.soft) kind = UPDATE.soft;
  }
  return kind;
}
