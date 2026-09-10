/**
 * Navigation guards for `createRouter()`.
 *
 * Wraps a router instance so that navigation can be intercepted, redirected, or
 * aborted before the URL changes. Guards run in registration order against a
 * preview of the destination route — matched against the router's own compiled
 * routes, without touching the History API — so an aborted or redirected
 * navigation never partially applies.
 *
 * Opt-in: `createRouter()` and the router it returns are unchanged by importing
 * this module. Call `withGuards(router)` to get a wrapped router with
 * `beforeEach()` / `afterEach()` and a `navigate()` that returns
 * `Promise<boolean>` instead of `void`.
 *
 *   import { createRouter } from '@basenative/router';
 *   import { withGuards, redirect } from '@basenative/router/guards';
 *
 *   const router = withGuards(createRouter(routes));
 *   router.beforeEach(({ to }) => {
 *     if (to.name === 'dashboard' && !isAuthenticated()) return redirect('/login');
 *   });
 *
 * @module
 */

/** Thrown by {@link redirect} to short-circuit a guard with a redirect. */
export class RedirectError extends Error {
  /**
   * @param {string} to
   * @param {boolean} [replace=true]
   */
  constructor(to, replace = true) {
    super(`Navigation redirected to ${to}`);
    this.name = 'RedirectError';
    this.to = to;
    this.replace = replace;
  }
}

/**
 * Aborts the current guard and redirects navigation to `to`. Throws a
 * {@link RedirectError}, which `withGuards()`'s guard runner catches.
 *
 * @param {string} to
 * @param {boolean} [replace=true]
 * @returns {never}
 */
export function redirect(to, replace = true) {
  throw new RedirectError(to, replace);
}

/**
 * Normalizes a guard's return value into an abort/redirect decision.
 * `false` aborts with no redirect; a string or `{ redirect }` aborts and
 * redirects; anything else (including `undefined`) lets navigation proceed.
 */
function applyGuardOutcome(outcome) {
  if (outcome === false) return { abort: true };
  if (typeof outcome === 'string') {
    return { abort: true, redirectTo: outcome, replace: true };
  }
  if (outcome && typeof outcome === 'object' && 'redirect' in outcome) {
    return {
      abort: true,
      redirectTo: outcome.redirect,
      replace: outcome.replace ?? true,
    };
  }
  return { abort: false };
}

function parsePreviewQuery(search) {
  const out = {};
  const stripped = search.startsWith('?') ? search.slice(1) : search;
  if (!stripped) return out;
  for (const pair of stripped.split('&')) {
    const [rawKey, rawValue] = pair.split('=');
    if (!rawKey) continue;
    out[decodeURIComponent(rawKey)] = rawValue ? decodeURIComponent(rawValue) : '';
  }
  return out;
}

/**
 * Matches `to` against `router.routes` (the compiled routes createRouter()
 * already built) without calling `navigate()` or touching history — this is
 * what lets guards see the destination route before committing to it.
 */
function previewMatch(router, to) {
  const [pathPart, searchPart = ''] = to.split('?');
  const stripped = pathPart || '/';
  for (const route of router.routes) {
    const match = route.compiled.regex.exec(stripped);
    if (!match) continue;
    const params = {};
    for (let i = 0; i < route.compiled.params.length; i++) {
      params[route.compiled.params[i]] = decodeURIComponent(match[i + 1]);
    }
    return {
      name: route.name ?? route.path,
      path: route.path,
      params,
      query: parsePreviewQuery(searchPart),
      matched: route,
    };
  }
  return {
    name: null,
    path: stripped,
    params: {},
    query: parsePreviewQuery(searchPart),
    matched: null,
  };
}

/**
 * Wraps a router instance (as returned by `createRouter()`) with
 * `beforeEach()` / `afterEach()` hooks. The wrapped router's `navigate()`
 * returns `Promise<boolean>`: `true` once navigation and all `afterEach`
 * handlers have run, `false` if a guard aborted or redirected it.
 *
 * Guard order: `beforeEach` guards run sequentially, in registration order,
 * against a single preview of the destination computed once up front (not
 * re-matched per guard). The first guard whose outcome aborts — returns
 * `false`, a path string, `{ redirect }`, or throws a `RedirectError` (via the
 * `redirect()` helper or directly) — stops the chain immediately; later
 * guards do not run. A redirect re-enters `navigate()` for the new
 * destination; the original `navigate()` call still resolves `false`. Any
 * other thrown error propagates: it rejects the `navigate()` promise rather
 * than being treated as an abort.
 *
 * Starting a new `navigate()` call while guards for a previous one are still
 * running aborts the in-flight call, whose promise then resolves `false`.
 *
 * @param {import('./router.js').Router} router
 * @returns {GuardedRouter}
 */
export function withGuards(router) {
  const beforeEachGuards = new Set();
  const afterEachHandlers = new Set();
  const originalNavigate = router.navigate.bind(router);

  let inFlight = null;

  async function guardedNavigate(to, options = {}) {
    if (inFlight) inFlight.abort();
    const controller = new AbortController();
    inFlight = controller;

    const fromMatch = router.currentRoute();
    const toMatch = previewMatch(router, to);
    const context = { to: toMatch, from: fromMatch, options };

    for (const guard of beforeEachGuards) {
      let outcome;
      try {
        outcome = await guard(context);
      } catch (error) {
        if (controller.signal.aborted) return false;
        if (error instanceof RedirectError) {
          inFlight = null;
          await guardedNavigate(error.to, { replace: error.replace });
          return false;
        }
        inFlight = null;
        throw error;
      }
      if (controller.signal.aborted) return false;
      const decision = applyGuardOutcome(outcome);
      if (decision.abort) {
        inFlight = null;
        if (decision.redirectTo) {
          await guardedNavigate(decision.redirectTo, { replace: decision.replace });
        }
        return false;
      }
    }

    if (controller.signal.aborted) return false;
    inFlight = null;
    originalNavigate(to, options);

    const settled = { to: router.currentRoute(), from: fromMatch, options };
    for (const handler of afterEachHandlers) {
      await handler(settled);
    }
    return true;
  }

  /**
   * Registers a `beforeEach` guard. Returns a function that unregisters it.
   */
  function beforeEach(guard) {
    beforeEachGuards.add(guard);
    return () => beforeEachGuards.delete(guard);
  }

  /**
   * Registers an `afterEach` handler, invoked once navigation succeeds.
   * Returns a function that unregisters it.
   */
  function afterEach(handler) {
    afterEachHandlers.add(handler);
    return () => afterEachHandlers.delete(handler);
  }

  return {
    pathname: router.pathname,
    query: router.query,
    currentRoute: router.currentRoute,
    routes: router.routes,
    back: router.back.bind(router),
    forward: router.forward.bind(router),
    navigate: guardedNavigate,
    beforeEach,
    afterEach,
  };
}
