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
