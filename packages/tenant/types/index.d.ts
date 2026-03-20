export interface MiddlewareRequest {
  method: string;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  ip?: string;
  params?: Record<string, string>;
}

export interface MiddlewareResponse {
  status?: number;
  headers: Record<string, string>;
  body?: unknown;
}

export interface MiddlewareContext {
  request: MiddlewareRequest;
  response: MiddlewareResponse;
  state: Record<string, unknown>;
}

export type MiddlewareFn = (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void> | void;

export type TenantResolver = (ctx: MiddlewareContext) => string | null;

// --- Resolvers ---

export interface SubdomainResolverOptions {
  baseDomain?: string;
  exclude?: string[];
}

export interface PathResolverOptions {
  prefix?: string;
}

export interface HeaderResolverOptions {
  header?: string;
}

export function createSubdomainResolver(options?: SubdomainResolverOptions): TenantResolver;
export function createPathResolver(options?: PathResolverOptions): TenantResolver;
export function createHeaderResolver(options?: HeaderResolverOptions): TenantResolver;
export function createCompositeResolver(resolvers: TenantResolver[]): TenantResolver;

// --- Middleware ---

export interface TenantMiddlewareOptions {
  stateKey?: string;
  onNotFound?: (ctx: MiddlewareContext) => void;
}

export interface RequireTenantOptions {
  stateKey?: string;
  status?: number;
  message?: string;
}

export interface TenantScopeOptions {
  column?: string;
  stateKey?: string;
}

export interface DatabaseAdapter {
  query(table: string, filters: Record<string, unknown>): unknown;
  insert(table: string, data: Record<string, unknown>): unknown;
  update(table: string, filters: Record<string, unknown>, data: Record<string, unknown>): unknown;
  delete(table: string, filters: Record<string, unknown>): unknown;
}

export interface ScopedAdapter {
  query(ctx: MiddlewareContext, table: string, filters?: Record<string, unknown>): unknown;
  insert(ctx: MiddlewareContext, table: string, data: Record<string, unknown>): unknown;
  update(ctx: MiddlewareContext, table: string, filters: Record<string, unknown>, data: Record<string, unknown>): unknown;
  delete(ctx: MiddlewareContext, table: string, filters?: Record<string, unknown>): unknown;
}

export function tenantMiddleware(resolver: TenantResolver, options?: TenantMiddlewareOptions): MiddlewareFn;
export function requireTenant(options?: RequireTenantOptions): MiddlewareFn;
export function tenantScope(adapter: DatabaseAdapter, options?: TenantScopeOptions): ScopedAdapter;
