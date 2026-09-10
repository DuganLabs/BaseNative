import { ApiError } from './api-error.js';

/**
 * Response envelope helpers. A success envelope is `{ data, meta? }` where
 * `meta` carries pagination (`{ total, page, perPage }`); an error envelope
 * is `{ error: { code, message, field? } }`.
 */

/**
 * @param {unknown} value
 * @returns {value is { data: unknown }}
 */
export function isApiResponse(value) {
  return typeof value === 'object' && value !== null && 'data' in value;
}

/**
 * @param {unknown} value
 * @returns {value is { error: { code: string, message: string, field?: string } }}
 */
export function isApiErrorEnvelope(value) {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  return typeof value.error === 'object' && value.error !== null;
}

function dataOf(envelope) {
  if (isApiErrorEnvelope(envelope)) {
    const { code, message, field } = envelope.error;
    throw new ApiError(message || 'Request failed', { status: 0, code, field, body: envelope });
  }
  if (!isApiResponse(envelope)) {
    throw new TypeError(
      'unwrap() expects an envelope shaped { data } or { error: { code, message } }; ' +
        `got ${envelope === null ? 'null' : typeof envelope}`
    );
  }
  return envelope.data;
}

/**
 * Returns the `data` of a success envelope — or, given a promise, a promise
 * for the `data` of the envelope it resolves to. Throws `ApiError` when the
 * envelope is an error envelope.
 *
 * @param {object | Promise<object>} envelope
 */
export function unwrap(envelope) {
  if (envelope && typeof envelope.then === 'function') return envelope.then(dataOf);
  return dataOf(envelope);
}
