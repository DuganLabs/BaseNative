import { signal, computed } from '@basenative/runtime';
import { compilePattern, matchRoute, parseQuery } from './match.js';

/**
 * Creates a router instance that manages client-side navigation.
 *
 * @param {Array<{path: string, name?: string, handler?: Function}>} routes
 * @param {object} [options]
 * @param {string} [options.base] - Base path prefix for all routes
 * @returns {Router}
 */
export function createRouter(routes, options = {}) {
  const base = (options.base || '').replace(/\/$/, '');

  // Compile route patterns upfront
  const compiled = routes.map((route) => ({
    ...route,
    compiled: compilePattern(route.path),
  }));

  // Reactive state
  const pathname = signal(currentPath());
  const query = signal(parseQuery(currentSearch()));

  // Computed current route match
  const currentRoute = computed(() => {
    const path = pathname();
    const stripped = base ? path.replace(new RegExp(`^${escapeRegex(base)}`), '') || '/' : path;

    for (const route of compiled) {
      const params = matchRoute(route.compiled, stripped);
      if (params !== null) {
        return {
          name: route.name || route.path,
          path: route.path,
          params,
          query: query(),
          matched: route,
        };
      }
    }

    return { name: null, path: stripped, params: {}, query: query(), matched: null };
  });

  function currentPath() {
    return typeof location !== 'undefined' ? location.pathname : '/';
  }

  function currentSearch() {
    return typeof location !== 'undefined' ? location.search : '';
  }

  /**
   * Navigate to a new path.
   */
  function navigate(to, { replace = false } = {}) {
    const fullPath = base + to;
    if (replace) {
      history.replaceState(null, '', fullPath);
    } else {
      history.pushState(null, '', fullPath);
    }
    pathname.set(currentPath());
    query.set(parseQuery(currentSearch()));
  }

  /**
   * Go back in browser history.
   */
  function back() {
    history.back();
  }

  /**
   * Go forward in browser history.
   */
  function forward() {
    history.forward();
  }

  // Listen for popstate (back/forward navigation)
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      pathname.set(currentPath());
      query.set(parseQuery(currentSearch()));
    });
  }

  return {
    pathname,
    query,
    currentRoute,
    navigate,
    back,
    forward,
    routes: compiled,
  };
}

/**
 * Server-side route resolution. Matches a URL against routes without browser APIs.
 *
 * @param {Array<{path: string, name?: string}>} routes
 * @param {string} url - The URL pathname to match
 * @param {object} [options]
 * @param {string} [options.base] - Base path prefix
 * @returns {{ name: string|null, path: string, params: object, query: object, matched: object|null }}
 */
export function resolveRoute(routes, url, options = {}) {
  const base = (options.base || '').replace(/\/$/, '');
  const [pathPart, searchPart] = url.split('?');
  const stripped = base ? pathPart.replace(new RegExp(`^${escapeRegex(base)}`), '') || '/' : pathPart;

  for (const route of routes) {
    const compiled = compilePattern(route.path);
    const params = matchRoute(compiled, stripped);
    if (params !== null) {
      return {
        name: route.name || route.path,
        path: route.path,
        params,
        query: parseQuery(searchPart || ''),
        matched: route,
      };
    }
  }

  return {
    name: null,
    path: stripped,
    params: {},
    query: parseQuery(searchPart || ''),
    matched: null,
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
