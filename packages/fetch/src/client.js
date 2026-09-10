import { ApiError } from './api-error.js';
import { isApiErrorEnvelope } from './envelope.js';
import { joinUrl, serializeQuery } from './query.js';

const BODY_INIT_TYPES = ['FormData', 'URLSearchParams', 'Blob', 'ReadableStream'];

function isBodyInit(body) {
  if (typeof body === 'string' || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return true;
  return BODY_INIT_TYPES.some(
    (name) => typeof globalThis[name] === 'function' && body instanceof globalThis[name]
  );
}

async function readBody(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (/\bjson\b/i.test(contentType)) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  if (contentType.startsWith('text/')) return response.text();
  return null;
}

function describeError(response, body) {
  const fallback = response.statusText || `HTTP ${response.status}`;
  if (isApiErrorEnvelope(body)) {
    const { code, message, field } = body.error;
    return { message: message || fallback, code, field };
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (typeof body === 'string' && body.length > 0 && contentType.startsWith('text/plain')) {
    return { message: body };
  }
  return { message: fallback };
}

function forwardAbort(source, controller) {
  if (!source) return () => {};
  if (source.aborted) {
    controller.abort(source.reason);
    return () => {};
  }
  const relay = () => controller.abort(source.reason);
  source.addEventListener('abort', relay, { once: true });
  return () => source.removeEventListener('abort', relay);
}

/**
 * Creates a typed fetch wrapper bound to a base URL. The returned client
 * resolves `path` (+ `params`) against `baseUrl`, JSON-encodes plain-object
 * bodies, parses JSON responses, and throws `ApiError` for non-2xx replies,
 * error envelopes, timeouts and network failures. Optional hooks cover
 * cross-cutting concerns (auth redirects, error tracking, telemetry).
 *
 * @param {object} options
 * @param {string | (() => string)} options.baseUrl - base URL, or a function resolved on every request
 * @param {HeadersInit} [options.headers] - headers sent with every request; per-request headers win
 * @param {typeof fetch} [options.fetch] - fetch implementation; defaults to `globalThis.fetch`
 * @param {RequestCredentials} [options.credentials] - default credentials mode; default `'include'`
 * @param {number} [options.timeoutMs] - abort requests that take longer than this
 * @param {Function} [options.onRequest] - `(ctx) => void | Promise<void>` before fetch
 * @param {Function} [options.onResponse] - `(ctx & { response }) => void | Promise<void>` after fetch, before status handling
 * @param {Function} [options.onUnauthorized] - `(error, ctx) => void | Promise<void>` on 401, before onError
 * @param {Function} [options.onError] - `(error, ctx) => void | Promise<void>` before every throw
 */
export function createApiClient(options) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const defaultCredentials = options.credentials ?? 'include';
  const { timeoutMs } = options;

  function resolveUrl(path, params) {
    const base = typeof options.baseUrl === 'function' ? options.baseUrl() : options.baseUrl;
    return joinUrl(base, path) + serializeQuery(params);
  }

  async function fail(error, ctx) {
    if (error.status === 401 && options.onUnauthorized) await options.onUnauthorized(error, ctx);
    if (options.onError) await options.onError(error, ctx);
    throw error;
  }

  async function request(req) {
    const url = resolveUrl(req.path, req.params);
    const method = (req.method ?? 'GET').toUpperCase();
    const headers = new Headers(options.headers);
    new Headers(req.headers).forEach((value, key) => headers.set(key, value));

    let body;
    if (req.body !== undefined && req.body !== null) {
      if (isBodyInit(req.body)) {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
        if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      }
    }

    const controller = timeoutMs ? new AbortController() : null;
    const unlink = controller ? forwardAbort(req.signal, controller) : () => {};
    let timeoutError = null;
    const timer = controller
      ? setTimeout(() => {
          timeoutError = new ApiError(`Request timed out after ${timeoutMs}ms`, {
            status: 0,
            code: 'timeout',
            url,
          });
          controller.abort(timeoutError);
        }, timeoutMs)
      : null;

    const init = {
      method,
      headers,
      body,
      credentials: req.credentials ?? defaultCredentials,
      signal: controller ? controller.signal : req.signal,
    };
    const ctx = { url, path: req.path, method, headers, init };

    try {
      if (options.onRequest) await options.onRequest(ctx);

      let response;
      try {
        response = await fetchImpl(url, init);
      } catch (cause) {
        if (req.signal?.aborted) throw cause;
        const error =
          timeoutError ??
          new ApiError(cause instanceof Error ? cause.message : 'Network request failed', {
            status: 0,
            code: 'network_error',
            url,
            cause,
          });
        return fail(error, ctx);
      }

      if (options.onResponse) await options.onResponse({ ...ctx, response });

      if (!response.ok) {
        const payload = await readBody(response);
        const { message, code, field } = describeError(response, payload);
        return fail(
          new ApiError(message, { status: response.status, code, field, url, body: payload, response }),
          ctx
        );
      }

      if (req.raw) return response;
      if (response.status === 204) return undefined;

      const payload = await readBody(response);
      if (isApiErrorEnvelope(payload)) {
        const { message, code, field } = describeError(response, payload);
        return fail(
          new ApiError(message, { status: response.status, code, field, url, body: payload, response }),
          ctx
        );
      }
      return payload;
    } finally {
      if (timer) clearTimeout(timer);
      unlink();
    }
  }

  return {
    request,
    resolveUrl,
    get: (path, params, init) => request({ ...init, path, params, method: 'GET' }),
    post: (path, body, init) => request({ ...init, path, body, method: 'POST' }),
    put: (path, body, init) => request({ ...init, path, body, method: 'PUT' }),
    patch: (path, body, init) => request({ ...init, path, body, method: 'PATCH' }),
    delete: (path, init) => request({ ...init, path, method: 'DELETE' }),
  };
}
