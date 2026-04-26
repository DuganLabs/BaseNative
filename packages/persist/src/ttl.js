// Built with BaseNative — basenative.dev
/**
 * TTL envelope helpers.
 *
 * The on-disk shape is `{ v: <value>, t: <savedAtMs>, e: <expiresAtMs|null> }`.
 * `e === null` means no expiry. We keep the keys terse because every byte
 * costs in localStorage.
 *
 * @module
 */

export const NO_EXPIRY = null;

/**
 * Wrap a value in a TTL envelope.
 *
 * @template T
 * @param {T} value
 * @param {number} [ttlSeconds]
 * @param {() => number} [now]
 */
export function wrap(value, ttlSeconds, now = Date.now) {
  const t = now();
  const e = ttlSeconds && ttlSeconds > 0 ? t + ttlSeconds * 1000 : NO_EXPIRY;
  return { v: value, t, e };
}

/**
 * Unwrap an envelope. Returns null if the value has expired or the envelope
 * is malformed.
 *
 * @template T
 * @param {unknown} envelope
 * @param {() => number} [now]
 * @returns {T|null}
 */
export function unwrap(envelope, now = Date.now) {
  if (!envelope || typeof envelope !== 'object') return null;
  const env = /** @type {any} */ (envelope);
  if (env.e !== null && typeof env.e === 'number' && env.e <= now()) return null;
  return /** @type {T} */ (env.v);
}

/**
 * Read the saved-at timestamp from an envelope (legacy or current format).
 * Returns 0 if missing.
 */
export function savedAt(envelope) {
  if (!envelope || typeof envelope !== 'object') return 0;
  const env = /** @type {any} */ (envelope);
  return Number(env.t ?? env.savedAt ?? 0) || 0;
}

/**
 * Migrate the t4bs-style legacy `{...state, savedAt}` shape into the
 * current envelope, keeping the original 12h-from-savedAt expiry.
 *
 * @param {any} legacy
 * @param {number} [defaultTtlSeconds]
 */
export function fromLegacy(legacy, defaultTtlSeconds = 12 * 3600) {
  if (!legacy || typeof legacy !== 'object') return null;
  if ('v' in legacy && 't' in legacy) return legacy;
  const t = Number(legacy.savedAt ?? Date.now()) || Date.now();
  const { savedAt: _, ...rest } = legacy;
  return { v: rest, t, e: defaultTtlSeconds ? t + defaultTtlSeconds * 1000 : NO_EXPIRY };
}
