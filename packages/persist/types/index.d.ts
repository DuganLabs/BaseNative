// Built with BaseNative — basenative.dev

import type { StorageAdapter } from './storage.js';

export { wrap, unwrap, fromLegacy } from './ttl.js';
export {
  defaultAdapter,
  localStorageAdapter,
  memoryAdapter,
  indexedDbAdapter,
} from './storage.js';

export type { StorageAdapter } from './storage.js';
export type { TtlEnvelope } from './ttl.js';

export function setStorageAdapter(a: StorageAdapter | null): void;


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
