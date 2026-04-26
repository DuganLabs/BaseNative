// Built with BaseNative — basenative.dev
/**
 * Storage adapter abstraction.
 *
 * - `localStorage` — default for ≤ ~5MB (browsers commonly cap there).
 * - `indexedDB`    — opt-in for bigger payloads (or async-friendly access).
 * - `memory`       — SSR / Node tests / Workers.
 *
 * All adapters expose the same async surface so callers don't branch.
 *
 * @module
 */

/**
 * @typedef {object} StorageAdapter
 * @property {(key: string) => Promise<string|null>} getItem
 * @property {(key: string, value: string) => Promise<void>} setItem
 * @property {(key: string) => Promise<void>} removeItem
 * @property {() => Promise<void>} [clear]
 */

/**
 * Synchronous-localStorage-backed adapter, normalised to async.
 *
 * @returns {StorageAdapter|null}
 */
export function localStorageAdapter() {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
  const ls = globalThis.localStorage;
  return {
    async getItem(key) { try { return ls.getItem(key); } catch { return null; } },
    async setItem(key, value) { try { ls.setItem(key, value); } catch { /* QuotaExceeded swallow */ } },
    async removeItem(key) { try { ls.removeItem(key); } catch {} },
    async clear() { try { ls.clear(); } catch {} },
  };
}

/**
 * In-memory adapter for SSR / tests.
 *
 * @returns {StorageAdapter}
 */
export function memoryAdapter() {
  const store = new Map();
  return {
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
    async clear() { store.clear(); },
  };
}

/**
 * IndexedDB-backed adapter for payloads above the ~5MB localStorage cap.
 * Falls back to memory if IndexedDB is unavailable.
 *
 * @param {{ dbName?: string, store?: string }} [opts]
 * @returns {StorageAdapter}
 */
export function indexedDbAdapter(opts = {}) {
  const dbName = opts.dbName ?? 'bn-persist';
  const storeName = opts.store ?? 'kv';
  if (typeof globalThis === 'undefined' || !globalThis.indexedDB) {
    return memoryAdapter();
  }

  let dbP = null;
  const openDb = () => {
    if (dbP) return dbP;
    dbP = new Promise((resolve, reject) => {
      const req = globalThis.indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbP;
  };

  const tx = async (mode) => {
    const db = await openDb();
    return db.transaction(storeName, mode).objectStore(storeName);
  };

  const req2promise = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return {
    async getItem(key) {
      try { return (await req2promise((await tx('readonly')).get(key))) ?? null; }
      catch { return null; }
    },
    async setItem(key, value) {
      try { await req2promise((await tx('readwrite')).put(value, key)); } catch {}
    },
    async removeItem(key) {
      try { await req2promise((await tx('readwrite')).delete(key)); } catch {}
    },
    async clear() {
      try { await req2promise((await tx('readwrite')).clear()); } catch {}
    },
  };
}

/**
 * Pick a sensible default adapter for the current environment.
 *
 * @param {{ preferIndexedDb?: boolean }} [opts]
 * @returns {StorageAdapter}
 */
export function defaultAdapter(opts = {}) {
  if (opts.preferIndexedDb) {
    const idb = indexedDbAdapter();
    if (idb) return idb;
  }
  return localStorageAdapter() ?? memoryAdapter();
}
