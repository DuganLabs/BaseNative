// Built with BaseNative — basenative.dev
/**
 * `@basenative/hmr` — state-preserving hot reload for BaseNative dev servers.
 *
 * Server-side entry point. The browser half is served from `client.js` and is
 * never imported into a Node process.
 */

export { isDevEnvironment, assertDevOnly } from './guard.js';
export { createWatcher, isIgnored, DEFAULT_IGNORED_DIRS } from './watcher.js';
export { createHmrServer } from './server.js';
export { hmrMiddleware, toPipelineMiddleware, interceptHtml } from './middleware.js';
export { createHmrProxy, waitForUpstream, isPortOpen, findFreePort } from './proxy.js';
export { injectClientScript, clientTag, isFullDocument } from './inject.js';
export {
  HMR_BASE,
  ROUTES,
  EVENTS,
  UPDATE,
  CLIENT_MARKER,
  SKIP_ATTR,
  PATCH_HEADER,
  classifyChange,
  classifyBatch,
} from './protocol.js';
