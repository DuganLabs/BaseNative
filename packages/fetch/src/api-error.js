/**
 * Error thrown by `createApiClient` whenever a request fails: a non-2xx
 * response, an error envelope in a 2xx body, a timeout, a network failure.
 * `unwrap()` throws it too when handed an error envelope directly.
 *
 * `code` mirrors the server's `error.code` when the body is an error
 * envelope and otherwise falls back to `http_<status>` — `http_network`
 * when no response was received at all (`status` 0).
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {object} init
   * @param {number} init.status - HTTP status, or 0 when no response was received
   * @param {string} [init.code] - machine-readable code; defaults to `http_<status>`
   * @param {string} [init.field] - form field the error refers to, when the envelope names one
   * @param {string} [init.url] - fully resolved request URL
   * @param {unknown} [init.body] - parsed response body, when one was read
   * @param {Response} [init.response] - the Response, when one was received (its body is already consumed)
   * @param {unknown} [init.cause] - underlying error for network failures
   */
  constructor(message, init) {
    super(message, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code ?? `http_${init.status || 'network'}`;
    this.field = init.field;
    this.url = init.url ?? '';
    this.body = init.body;
    this.response = init.response;
  }
}

/**
 * @param {unknown} value
 * @returns {value is ApiError}
 */
export function isApiError(value) {
  return value instanceof ApiError;
}
