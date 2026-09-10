import type { Signal } from '@basenative/runtime';

export interface Resource<T = unknown> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  status: Signal<'idle' | 'loading' | 'success' | 'error'>;
  fetch(params?: unknown): Promise<T | null>;
  refetch(params?: unknown): Promise<T | null>;
  mutate(value: T | ((prev: T | null) => T)): void;
}

export interface ResourceOptions<T = unknown> {
  initialData?: T;
  immediate?: boolean;
  key?: string;
}

export interface Mutation<T = unknown, P = unknown> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  status: Signal<'idle' | 'loading' | 'success' | 'error'>;
  mutate(params?: P): Promise<T | null>;
  reset(): void;
}

export interface MutationOptions<T = unknown, P = unknown> {
  onSuccess?: (data: T, params?: P) => void;
  onError?: (error: Error, params?: P) => void;
}

export interface Cache {
  get(key: string): unknown | undefined;
  set(key: string, data: unknown): void;
  invalidate(key?: string): void;
  has(key: string): boolean;
  readonly size: number;
}

export function createResource<T>(fetcher: (params?: unknown, options?: { signal: AbortSignal }) => Promise<T>, options?: ResourceOptions<T>): Resource<T>;
export function createMutation<T, P = unknown>(mutationFn: (params?: P) => Promise<T>, options?: MutationOptions<T, P>): Mutation<T, P>;
export function createCache(options?: { maxAge?: number; maxSize?: number }): Cache;
export function fetchJson<T>(url: string, options?: RequestInit & { body?: unknown }): Promise<T>;

// ── API client ───────────────────────────────────────────────────────

/** Success envelope: `{ data, meta? }`; `meta` carries pagination. */
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: { total: number; page: number; perPage: number };
}

/** Error envelope: `{ error: { code, message, field? } }`. */
export interface ApiErrorEnvelope {
  error: { code: string; message: string; field?: string };
}

export interface ApiErrorInit {
  /** HTTP status, or `0` when no response was received (network failure, timeout, bare envelope). */
  status: number;
  /** Machine-readable code; defaults to `http_<status>` (`http_network` for status 0). */
  code?: string;
  /** Form field the error refers to, when the envelope names one. */
  field?: string;
  /** Fully resolved request URL; defaults to `''`. */
  url?: string;
  /** Parsed response body, when one was read. */
  body?: unknown;
  /** The Response, when one was received. Its body is already consumed; read `body` instead. */
  response?: Response;
  /** Underlying error for network failures. */
  cause?: unknown;
}

export class ApiError extends Error {
  readonly name: 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly field: string | undefined;
  readonly url: string;
  readonly body: unknown;
  readonly response: Response | undefined;
  constructor(message: string, init: ApiErrorInit);
}

export function isApiError(value: unknown): value is ApiError;
export function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T>;
export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope;
/** Returns `envelope.data`; throws `ApiError` for an error envelope, `TypeError` for anything else. */
export function unwrap<T>(envelope: ApiResponse<T>): T;
export function unwrap<T>(envelope: Promise<ApiResponse<T>>): Promise<T>;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Readonly<Record<string, QueryValue | readonly QueryValue[]>>;

/** `?a=1&b=2` (keys sorted, arrays repeated, null/undefined skipped) or `''`. */
export function serializeQuery(params: QueryParams | null | undefined): string;
/** Joins with exactly one `/`; an empty base returns `path`, an absolute `path` is returned as is. */
export function joinUrl(base: string, path: string): string;

export type FetchImpl = typeof fetch;
export type BaseUrlResolver = string | (() => string);

export interface RequestContext {
  readonly url: string;
  readonly path: string;
  readonly method: string;
  readonly headers: Headers;
  readonly init: RequestInit;
}

export interface ResponseContext extends RequestContext {
  readonly response: Response;
}

export interface ApiClientOptions {
  /** Base URL, or a function resolved on every request. */
  baseUrl: BaseUrlResolver;
  /** Headers sent with every request; per-request headers win. */
  headers?: HeadersInit;
  /** Defaults to `globalThis.fetch`. */
  fetch?: FetchImpl;
  /** Default credentials mode; default `'include'`. */
  credentials?: RequestCredentials;
  /** Abort requests that take longer than this; they reject with an `ApiError` whose `code` is `'timeout'`. */
  timeoutMs?: number;
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (ctx: ResponseContext) => void | Promise<void>;
  /** Runs on a 401 response, before `onError`. */
  onUnauthorized?: (error: ApiError, ctx: RequestContext) => void | Promise<void>;
  /** Runs before every `ApiError` is thrown. */
  onError?: (error: ApiError, ctx: RequestContext) => void | Promise<void>;
}

export interface RequestOptions {
  path: string;
  /** Default `'GET'`; upper-cased. */
  method?: string;
  params?: QueryParams;
  /** Plain objects are JSON-encoded; `string`, `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer`, views and streams pass through. */
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  /** Resolve with the `Response` itself instead of the parsed body (non-2xx still throws). */
  raw?: boolean;
}

export type VerbOptions = Omit<RequestOptions, 'path' | 'method'>;

export interface ApiClient {
  request<T = unknown>(options: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, params?: QueryParams, init?: Omit<VerbOptions, 'params'>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, init?: Omit<VerbOptions, 'body'>): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, init?: Omit<VerbOptions, 'body'>): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, init?: Omit<VerbOptions, 'body'>): Promise<T>;
  delete<T = unknown>(path: string, init?: VerbOptions): Promise<T>;
  resolveUrl(path: string, params?: QueryParams): string;
}

/**
 * Typed fetch wrapper bound to a base URL: resolves paths and params, JSON-encodes
 * plain-object bodies, parses JSON responses, and throws `ApiError` for non-2xx
 * replies, error envelopes, timeouts and network failures.
 */
export function createApiClient(options: ApiClientOptions): ApiClient;
