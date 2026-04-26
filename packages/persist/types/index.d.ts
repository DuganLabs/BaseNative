// Built with BaseNative — basenative.dev

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
}

export function defaultAdapter(opts?: { preferIndexedDb?: boolean }): StorageAdapter;
export function localStorageAdapter(): StorageAdapter | null;
export function memoryAdapter(): StorageAdapter;
export function indexedDbAdapter(opts?: { dbName?: string; store?: string }): StorageAdapter;
export function setStorageAdapter(a: StorageAdapter | null): void;

export interface TtlEnvelope<T> { v: T; t: number; e: number | null; }
export function wrap<T>(value: T, ttlSeconds?: number, now?: () => number): TtlEnvelope<T>;
export function unwrap<T>(envelope: unknown, now?: () => number): T | null;
export function fromLegacy<T>(legacy: any, defaultTtlSeconds?: number): TtlEnvelope<T> | null;

export function loadPersisted<T = unknown>(key: string, opts?: { legacyTtlSeconds?: number }): Promise<T | null>;
export function savePersisted<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
export function clearPersisted(key: string): Promise<void>;
export function persistedSavedAt(key: string): Promise<number>;

export interface SignalLike<T> {
  value?: T;
  peek?: () => T;
  get?: () => T;
  set?: (v: T) => void;
  subscribe?: (cb: (v: T) => void) => () => void;
}

export function persisted<T>(
  key: string,
  signal: SignalLike<T>,
  opts?: {
    ttlSeconds?: number;
    resolve?: (local: T | null, current: T) => T;
    serialize?: (v: T) => any;
    deserialize?: (raw: any) => T;
    debounceMs?: number;
  }
): () => void;

export function hydrateFromServer<T>(args: {
  key: string;
  fetch: () => Promise<T | null>;
  onResolve: (value: T | null, ctx: { source: 'local' | 'server'; local: T | null }) => void;
  ttlSeconds?: number;
  reconcile?: (local: T | null, server: T | null) => T | null;
  onError?: (err: any) => void;
}): Promise<T | null>;
