import type { Signal } from '@basenative/runtime';

export interface RouteDefinition {
  path: string;
  name?: string;
  handler?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

export interface ResolvedRoute {
  name: string | null;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  matched: RouteDefinition | null;
}

export interface Router {
  pathname: Signal<string>;
  query: Signal<Record<string, string>>;
  currentRoute: Signal<ResolvedRoute>;
  navigate(to: string, options?: { replace?: boolean }): void;
  back(): void;
  forward(): void;
  routes: RouteDefinition[];
}

export function createRouter(
  routes: RouteDefinition[],
  options?: { base?: string },
): Router;

export function resolveRoute(
  routes: RouteDefinition[],
  url: string,
  options?: { base?: string },
): ResolvedRoute;

export function compilePattern(pattern: string): { regex: RegExp; params: string[] };
export function matchRoute(
  pattern: string | { regex: RegExp; params: string[] },
  pathname: string,
): Record<string, string> | null;
export function parseQuery(search: string): Record<string, string>;
export function buildQuery(params: Record<string, string | null | undefined>): string;
export function interceptLinks(
  root: Element,
  router: Router,
  options?: { selector?: string },
): () => void;

// --- Navigation Guards ---
// Also available (and re-declared here since the main entry re-exports them
// too) as the `@basenative/router/guards` subpath — see types/guards.d.ts.

/** Mirrors the inline `options` type of `Router.navigate()`. */
export interface NavigateOptions {
  replace?: boolean;
}

export interface NavigationContext {
  readonly to: ResolvedRoute;
  readonly from: ResolvedRoute | null;
  readonly options: NavigateOptions;
}

export type GuardOutcome =
  | void
  | undefined
  | boolean
  | string
  | { readonly redirect: string; readonly replace?: boolean };

export type NavigationGuard = (
  context: NavigationContext,
) => GuardOutcome | Promise<GuardOutcome>;

export type AfterNavigationHandler = (
  context: NavigationContext,
) => void | Promise<void>;

/** Thrown by {@link redirect} to short-circuit a guard with a redirect. */
export class RedirectError extends Error {
  readonly to: string;
  readonly replace: boolean;
  constructor(to: string, replace?: boolean);
}

/**
 * Aborts the current guard and redirects navigation to `to`. Throws a
 * {@link RedirectError}.
 */
export function redirect(to: string, replace?: boolean): never;

export interface GuardedRouter extends Omit<Router, 'navigate'> {
  navigate(to: string, options?: NavigateOptions): Promise<boolean>;
  /** Registers a `beforeEach` guard. Returns a function that unregisters it. */
  beforeEach(guard: NavigationGuard): () => void;
  /** Registers an `afterEach` handler. Returns a function that unregisters it. */
  afterEach(handler: AfterNavigationHandler): () => void;
}

/**
 * Wraps a router instance with `beforeEach()` / `afterEach()` hooks so that
 * navigation can be intercepted, redirected, or aborted before the URL
 * changes. Opt-in: `createRouter()`'s own return value is unaffected.
 */
export function withGuards(router: Router): GuardedRouter;
