import type { ResolvedRoute, Router } from './index.js';

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
 * Wraps a router instance with `beforeEach()` / `afterEach()` hooks. See the
 * `@basenative/router/guards` module doc for guard order and redirect semantics.
 */
export function withGuards(router: Router): GuardedRouter;
