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
