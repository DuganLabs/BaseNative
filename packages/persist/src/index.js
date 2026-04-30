// Built with BaseNative — basenative.dev
/**
 * @basenative/persist — TTL-aware local persistence + signal binding +
 * server-rehydrate hook.
 *
 * Three layers, each usable on its own:
 *
 *   1. `loadPersisted` / `savePersisted` / `clearPersisted` — flat KV API
 *      over a pluggable storage adapter, with a TTL envelope.
 *   2. `persisted(key, signal)` — bidirectional bind between a signal and
 *      storage. Reads on creation, writes on every change.
 *   3. `hydrateFromServer` — combines local read + server fetch + reconcile
 *      to handle the "session resume across tabs / reloads / devices"
 *      pattern from t4bs.
 *
 * The signal layer is opt-in: pass any `{ peek?, get?, set?, subscribe? }`
 * shaped object — it works with `@basenative/runtime` signals out of the
 * box, and with anything else that exposes `subscribe + .value` or
 * `get + set`.
 *
 * @module
 */

import { wrap, unwrap, fromLegacy, savedAt as readSavedAt } from './ttl.js';
import { defaultAdapter } from './storage.js';

let _adapter = null;
const adapter = () => (_adapter ??= defaultAdapter());

/**
 * Override the global storage adapter (e.g. switch to IndexedDB or memory
 * for tests). Pass `null` to reset.
 *
 * @param {ReturnType<typeof defaultAdapter>|null} a
 */
export function setStorageAdapter(a) { _adapter = a; }

const isLegacyShape = (parsed) => parsed && typeof parsed === 'object' && !('v' in parsed) && !('t' in parsed) && 'savedAt' in parsed;

/**
 * Read a key. Honors the TTL envelope; returns null if expired or absent.
 *
 * Also handles the t4bs legacy format (`{...state, savedAt}` with implicit
 * 12h expiry) for free.
 *
 * @template T
 * @param {string} key
 * @param {{ legacyTtlSeconds?: number }} [opts]
 * @returns {Promise<T|null>}
 */
export async function loadPersisted(key, opts = {}) {
  try {
    const raw = await adapter().getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isLegacyShape(parsed)) {
      const env = fromLegacy(parsed, opts.legacyTtlSeconds ?? 12 * 3600);
      const v = unwrap(env);
      if (v === null) await adapter().removeItem(key);
      return v;
    }
    const v = unwrap(parsed);
    if (v === null) await adapter().removeItem(key);
    return v;
  } catch {
    return null;
  }
}

/**
 * Write a key. `ttlSeconds` of `0`/`undefined` means no expiry.
 *
 * @template T
 * @param {string} key
 * @param {T} value
 * @param {number} [ttlSeconds]
 */
export async function savePersisted(key, value, ttlSeconds) {
  try {
    const env = wrap(value, ttlSeconds);
    await adapter().setItem(key, JSON.stringify(env));
  } catch { /* QuotaExceeded etc — caller should treat persistence as best-effort */ }
}

/** @param {string} key */
export async function clearPersisted(key) {
  try { await adapter().removeItem(key); } catch {}
}

/**
 * Read the saved-at timestamp without deserialising the full payload.
 *
 * @param {string} key
 */
export async function persistedSavedAt(key) {
  try {
    const raw = await adapter().getItem(key);
    if (!raw) return 0;
    return readSavedAt(JSON.parse(raw));
  } catch { return 0; }
}

/**
 * Bidirectional bind between a signal and a persistence key.
 *
 * The signal is hydrated synchronously from the cached envelope (when the
 * adapter is sync — i.e. localStorage/memory) and reactively written on
 * every change.
 *
 * @template T
 * @param {string} key
 * @param {{ value: T, set?: (v: T) => void, subscribe?: (cb: (v: T) => void) => () => void } | any} signal
 * @param {{
 *   ttlSeconds?: number,
 *   resolve?: (local: T|null, current: T) => T,
 *   serialize?: (v: T) => any,
 *   deserialize?: (raw: any) => T,
 *   debounceMs?: number,
 * }} [opts]
 * @returns {() => void} dispose
 */
export function persisted(key, signal, opts = {}) {
  const ser = opts.serialize ?? ((v) => v);
  const des = opts.deserialize ?? ((v) => v);
  const debounceMs = Math.max(0, opts.debounceMs ?? 0);

  let disposed = false;
  let lastWriteTimer = null;
  const flushNow = (val) => savePersisted(key, ser(val), opts.ttlSeconds);
  const flush = (val) => {
    if (debounceMs === 0) return flushNow(val);
    if (lastWriteTimer) clearTimeout(lastWriteTimer);
    lastWriteTimer = setTimeout(() => flushNow(val), debounceMs);
  };

  // Initial load + reconcile.
  loadPersisted(key).then((raw) => {
    if (disposed || raw === null) return;
    const local = des(raw);
    const current = readSignal(signal);
    const next = opts.resolve ? opts.resolve(local, current) : local;
    writeSignal(signal, next);
  });

  // Subscribe → flush on change.
  const stop = subscribeSignal(signal, (v) => {
    if (!disposed) flush(v);
  });

  return () => {
    disposed = true;
    if (lastWriteTimer) clearTimeout(lastWriteTimer);
    stop?.();
  };
}

/**
 * Combine local-cache read + server fetch + reconcile.
 *
 * Order of operations:
 *   1. Read local persisted value — if present, hand it to `onResolve`
 *      immediately (so the UI can paint optimistically).
 *   2. Run `fetch()` to get authoritative state.
 *   3. Call `onResolve(authoritative, { local, source: 'server' })`.
 *   4. Persist the authoritative result for the next reload.
 *
 * If the server fetch fails, the local cache is preserved and `onResolve`
 * is not called a second time.
 *
 * Mirrors the App.jsx resume pattern in t4bs.
 *
 * @template T
 * @param {{
 *   key: string,
 *   fetch: () => Promise<T|null>,
 *   onResolve: (value: T|null, ctx: { source: 'local'|'server', local: T|null }) => void,
 *   ttlSeconds?: number,
 *   reconcile?: (local: T|null, server: T|null) => T|null,
 *   onError?: (err: any) => void,
 * }} args
 */
export async function hydrateFromServer(args) {
  const local = await loadPersisted(args.key);
  if (local !== null) {
    try { args.onResolve(local, { source: 'local', local }); } catch (e) { args.onError?.(e); }
  }
  let server;
  try {
    server = await args.fetch();
  } catch (e) {
    args.onError?.(e);
    return local;
  }
  const reconciled = args.reconcile
    ? args.reconcile(local, server)
    : (server ?? local);
  try { args.onResolve(reconciled, { source: 'server', local }); } catch (e) { args.onError?.(e); }
  if (reconciled !== null && reconciled !== undefined) {
    await savePersisted(args.key, reconciled, args.ttlSeconds);
  }
  return reconciled;
}

// ─── signal interop ───────────────────────────────────────────────

function readSignal(s) {
  if (s == null) return undefined;
  if (typeof s.peek === 'function') return s.peek();
  if (typeof s.get === 'function') return s.get();
  if ('value' in s) return s.value;
  return undefined;
}

function writeSignal(s, v) {
  if (s == null) return;
  if (typeof s.set === 'function') return s.set(v);
  if ('value' in s) { s.value = v; return; }
}

function subscribeSignal(s, cb) {
  if (s == null) return null;
  if (typeof s.subscribe === 'function') return s.subscribe(cb);
  // basenative-runtime style: signal is a function/proxy with a subscribe method
  if (typeof s.on === 'function') return s.on('change', cb);
  return null;
}

export { wrap, unwrap, fromLegacy } from './ttl.js';
export { defaultAdapter, localStorageAdapter, memoryAdapter, indexedDbAdapter } from './storage.js';
