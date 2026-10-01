// Built with BaseNative — basenative.dev

export interface TtlEnvelope<T> { v: T; t: number; e: number | null; }

/** Marks an envelope that never expires. */
export const NO_EXPIRY: null;
export function wrap<T>(value: T, ttlSeconds?: number, now?: () => number): TtlEnvelope<T>;
export function unwrap<T>(envelope: unknown, now?: () => number): T | null;
/** Reads the saved-at timestamp from an envelope (legacy or current format); 0 if missing. */
export function savedAt(envelope: unknown): number;
export function fromLegacy<T>(legacy: any, defaultTtlSeconds?: number): TtlEnvelope<T> | null;
