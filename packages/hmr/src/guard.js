// Built with BaseNative — basenative.dev
/**
 * The production guard.
 *
 * HMR injects a script tag and opens a file watcher. Neither belongs in a
 * production build, so every entry point in this package asks this module
 * first — at *request* time, not just at construction time, because a server
 * that boots before `NODE_ENV` is set would otherwise stay hot forever.
 *
 * `NODE_ENV=production` is absolute: there is deliberately no env var, option,
 * or force flag that turns HMR back on. The only knobs go the other way.
 */

/** Values of `BN_HMR` that switch HMR off in an otherwise-dev environment. */
const OFF = new Set(['0', 'off', 'false', 'no']);

/**
 * Is this process allowed to run HMR?
 *
 * @param {Record<string, string | undefined>} [env] Defaults to `process.env`.
 * @returns {boolean}
 */
export function isDevEnvironment(env = globalThis.process?.env ?? {}) {
  const nodeEnv = String(env.NODE_ENV ?? '').trim().toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'prod') return false;
  if (OFF.has(String(env.BN_HMR ?? '').trim().toLowerCase())) return false;
  return true;
}

/**
 * Throw when called outside a development environment.
 *
 * Used by the entry points that start something long-lived (the proxy, the
 * watcher). The request-path middleware does not throw — it degrades to a
 * pass-through, so a pipeline that accidentally ships with `hmrMiddleware()`
 * still serves traffic instead of 500ing.
 *
 * @param {string} api Name of the calling API, used in the error message.
 * @param {Record<string, string | undefined>} [env]
 */
export function assertDevOnly(api, env = globalThis.process?.env ?? {}) {
  if (isDevEnvironment(env)) return;
  throw new Error(
    `@basenative/hmr: ${api}() refused to start because NODE_ENV=${env.NODE_ENV ?? ''}. ` +
      'HMR is a development-only tool. Remove the call from your production entry point, ' +
      'or guard it with `if (process.env.NODE_ENV !== "production")`.'
  );
}
