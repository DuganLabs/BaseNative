import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from './client.js';
import { ApiError, isApiError } from './api-error.js';

function makeFetch(response) {
  const calls = [];
  const fn = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, init });
    return typeof response === 'function' ? response(url, init) : response;
  };
  return Object.assign(fn, { calls });
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

function hangingFetch() {
  return makeFetch((url, init) => {
    if (init.signal?.aborted) return Promise.reject(init.signal.reason);
    return new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
  });
}

function client(fetchImpl, extra = {}) {
  return createApiClient({ baseUrl: 'https://api.example.com', fetch: fetchImpl, ...extra });
}

describe('createApiClient', () => {
  it('issues GET requests against the resolved base URL', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: { ok: true } }));
    const result = await client(fetchImpl).get('/api/leads');
    assert.deepEqual(result, { data: { ok: true } });
    assert.equal(fetchImpl.calls[0].url, 'https://api.example.com/api/leads');
    assert.equal(fetchImpl.calls[0].init.method, 'GET');
    assert.equal(fetchImpl.calls[0].init.credentials, 'include');
  });

  it('serialises params into the URL', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: [] }));
    await client(fetchImpl).get('/api/leads', { page: 2, q: 'hello world' });
    assert.equal(fetchImpl.calls[0].url, 'https://api.example.com/api/leads?page=2&q=hello%20world');
  });

  it('JSON-encodes object bodies and sets content-type', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: { id: 'lead-1' } }));
    await client(fetchImpl).post('/api/leads', { firstName: 'Jane' });
    const { init } = fetchImpl.calls[0];
    assert.equal(init.headers.get('content-type'), 'application/json');
    assert.equal(init.body, '{"firstName":"Jane"}');
  });

  it('does not stringify FormData bodies', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: null }));
    const fd = new FormData();
    fd.append('email', 'jane@example.com');
    await client(fetchImpl).post('/api/auth/login', fd);
    const { init } = fetchImpl.calls[0];
    assert.ok(init.body instanceof FormData);
    assert.equal(init.headers.get('content-type'), null);
  });

  it('returns undefined for 204 No Content', async () => {
    const fetchImpl = makeFetch(new Response(null, { status: 204 }));
    assert.equal(await client(fetchImpl).delete('/api/leads/1'), undefined);
  });

  it('returns the raw Response when raw is true', async () => {
    const raw = jsonResponse({ data: 'x' });
    const result = await client(makeFetch(raw)).request({ path: '/api/leads', raw: true });
    assert.equal(result, raw);
  });

  it('throws ApiError with envelope code/message on 4xx', async () => {
    const fetchImpl = makeFetch(
      jsonResponse(
        { error: { code: 'invalid_input', message: 'Email required', field: 'email' } },
        { status: 422 }
      )
    );
    await assert.rejects(client(fetchImpl).post('/api/leads', {}), (err) => {
      assert.equal(err.name, 'ApiError');
      assert.equal(err.status, 422);
      assert.equal(err.code, 'invalid_input');
      assert.equal(err.message, 'Email required');
      assert.equal(err.field, 'email');
      return true;
    });
  });

  it('falls back to status text when no envelope is returned', async () => {
    const fetchImpl = makeFetch(new Response('Not Found', { status: 404, statusText: 'Not Found' }));
    await assert.rejects(client(fetchImpl).get('/api/missing'), {
      status: 404,
      code: 'http_404',
      message: 'Not Found',
    });
  });

  it('wraps network failures as ApiError with status 0', async () => {
    const failure = new TypeError('Failed to fetch');
    const fetchImpl = makeFetch(() => {
      throw failure;
    });
    await assert.rejects(client(fetchImpl).get('/api/leads'), (err) => {
      assert.ok(isApiError(err));
      assert.equal(err.status, 0);
      assert.equal(err.code, 'network_error');
      assert.equal(err.message, 'Failed to fetch');
      assert.equal(err.cause, failure);
      return true;
    });
  });

  it('invokes onRequest, onResponse, and onError hooks', async () => {
    const onRequest = mock.fn();
    const onResponse = mock.fn();
    const onError = mock.fn();
    const fetchImpl = makeFetch(jsonResponse({ data: 1 }));
    await client(fetchImpl, { onRequest, onResponse, onError }).get('/api/x');
    assert.equal(onRequest.mock.callCount(), 1);
    assert.equal(onResponse.mock.callCount(), 1);
    assert.equal(onError.mock.callCount(), 0);
  });

  it('invokes onError but still throws when a request fails', async () => {
    const onError = mock.fn();
    const fetchImpl = makeFetch(new Response('boom', { status: 500 }));
    await assert.rejects(client(fetchImpl, { onError }).get('/api/x'), (err) => err instanceof ApiError);
    assert.equal(onError.mock.callCount(), 1);
  });

  it('respects credentials override per-request', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: null }));
    await client(fetchImpl).request({ path: '/x', credentials: 'omit' });
    assert.equal(fetchImpl.calls[0].init.credentials, 'omit');
  });

  it('merges client headers with per-request headers', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: null }));
    await client(fetchImpl, { headers: { 'x-app': 'demo' } }).get('/api/x', undefined, {
      headers: { 'x-trace': 't1' },
    });
    const { headers } = fetchImpl.calls[0].init;
    assert.equal(headers.get('x-app'), 'demo');
    assert.equal(headers.get('x-trace'), 't1');
  });

  it('resolves base URL lazily when given a function', async () => {
    let host = 'https://a.example.com';
    const fetchImpl = makeFetch(() => jsonResponse({ data: null }));
    const api = createApiClient({ baseUrl: () => host, fetch: fetchImpl });
    await api.get('/api/x');
    host = 'https://b.example.com';
    await api.get('/api/x');
    assert.ok(fetchImpl.calls[0].url.startsWith('https://a.example.com'));
    assert.ok(fetchImpl.calls[1].url.startsWith('https://b.example.com'));
  });

  it('exposes resolveUrl for tooling', () => {
    const api = client(makeFetch(new Response()));
    assert.equal(api.resolveUrl('/api/leads', { page: 1 }), 'https://api.example.com/api/leads?page=1');
  });
});

describe('createApiClient HTTP verbs', () => {
  it('PUT sends JSON body', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: 'ok' }));
    await client(fetchImpl).put('/x', { y: 1 });
    assert.equal(fetchImpl.calls[0].init.method, 'PUT');
    assert.equal(fetchImpl.calls[0].init.body, '{"y":1}');
  });

  it('PATCH sends JSON body', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: 'ok' }));
    await client(fetchImpl).patch('/x', { y: 2 });
    assert.equal(fetchImpl.calls[0].init.method, 'PATCH');
    assert.equal(fetchImpl.calls[0].init.body, '{"y":2}');
  });

  it('DELETE has no body', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: 'ok' }));
    await client(fetchImpl).delete('/x');
    assert.equal(fetchImpl.calls[0].init.method, 'DELETE');
    assert.equal(fetchImpl.calls[0].init.body, undefined);
  });
});

describe('createApiClient envelopes and error bodies', () => {
  it('throws ApiError when a 2xx body is an error envelope', async () => {
    const fetchImpl = makeFetch(jsonResponse({ error: { code: 'expired', message: 'Session expired' } }));
    await assert.rejects(client(fetchImpl).get('/api/me'), (err) => {
      assert.ok(isApiError(err));
      assert.equal(err.status, 200);
      assert.equal(err.code, 'expired');
      assert.equal(err.message, 'Session expired');
      return true;
    });
  });

  it('exposes the parsed body, the Response and the url on ApiError', async () => {
    const envelope = { error: { code: 'conflict', message: 'Taken' } };
    const fetchImpl = makeFetch(jsonResponse(envelope, { status: 409 }));
    await assert.rejects(client(fetchImpl).post('/api/users', { email: 'x' }), (err) => {
      assert.deepEqual(err.body, envelope);
      assert.ok(err.response instanceof Response);
      assert.equal(err.response.status, 409);
      assert.equal(err.url, 'https://api.example.com/api/users');
      return true;
    });
  });

  it('uses a text/plain error body as the message but not an HTML page', async () => {
    const plain = makeFetch(
      new Response('quota exceeded', { status: 429, headers: { 'content-type': 'text/plain' } })
    );
    await assert.rejects(client(plain).get('/x'), { message: 'quota exceeded', code: 'http_429' });

    const html = makeFetch(
      new Response('<html>Nope</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'content-type': 'text/html' },
      })
    );
    await assert.rejects(client(html).get('/x'), (err) => {
      assert.equal(err.message, 'Bad Gateway');
      assert.equal(err.body, '<html>Nope</html>');
      return true;
    });
  });

  it('falls back to "HTTP <status>" when there is neither status text nor body', async () => {
    const fetchImpl = makeFetch(new Response(null, { status: 418 }));
    await assert.rejects(client(fetchImpl).get('/x'), { message: 'HTTP 418', code: 'http_418' });
  });

  it('parses +json media types', async () => {
    const fetchImpl = makeFetch(
      new Response('{"data":1}', { headers: { 'content-type': 'application/vnd.api+json' } })
    );
    assert.deepEqual(await client(fetchImpl).get('/x'), { data: 1 });
  });

  it('passes binary and URLSearchParams bodies through untouched', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchImpl = makeFetch(() => jsonResponse({ data: null }));
    const api = client(fetchImpl);
    await api.post('/x', bytes);
    assert.equal(fetchImpl.calls[0].init.body, bytes);
    assert.equal(fetchImpl.calls[0].init.headers.get('content-type'), null);

    const params = new URLSearchParams({ a: '1' });
    await api.post('/x', params);
    assert.equal(fetchImpl.calls[1].init.body, params);
  });

  it('keeps an explicit content-type when JSON-encoding', async () => {
    const fetchImpl = makeFetch(jsonResponse({ data: null }));
    await client(fetchImpl).patch('/x', { a: 1 }, { headers: { 'content-type': 'application/merge-patch+json' } });
    assert.equal(fetchImpl.calls[0].init.headers.get('content-type'), 'application/merge-patch+json');
    assert.equal(fetchImpl.calls[0].init.body, '{"a":1}');
  });
});

describe('createApiClient hooks', () => {
  it('fires onUnauthorized before onError on 401 only', async () => {
    const order = [];
    const hooks = {
      onUnauthorized: (err, ctx) => order.push(['unauthorized', err.status, ctx.path]),
      onError: (err) => order.push(['error', err.status]),
    };
    const denied = { error: { code: 'unauthenticated', message: 'Sign in' } };

    await assert.rejects(
      client(makeFetch(jsonResponse(denied, { status: 401 })), hooks).get('/api/me'),
      { code: 'unauthenticated' }
    );
    assert.deepEqual(order, [['unauthorized', 401, '/api/me'], ['error', 401]]);

    order.length = 0;
    await assert.rejects(client(makeFetch(jsonResponse(denied, { status: 403 })), hooks).get('/api/admin'));
    assert.deepEqual(order, [['error', 403]]);
  });

  it('awaits async hooks and passes the request context', async () => {
    const order = [];
    const fetchImpl = makeFetch(() => {
      order.push('fetch');
      return jsonResponse({ data: 1 });
    });
    await client(fetchImpl, {
      onRequest: async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        assert.equal(ctx.url, 'https://api.example.com/api/x?a=1');
        assert.equal(ctx.path, '/api/x');
        assert.equal(ctx.method, 'POST');
        assert.ok(ctx.headers instanceof Headers);
        assert.equal(ctx.init.body, '{"b":2}');
        order.push('request');
      },
      onResponse: (ctx) => {
        assert.equal(ctx.response.status, 200);
        order.push('response');
      },
    }).request({ path: '/api/x', method: 'post', params: { a: 1 }, body: { b: 2 } });
    assert.deepEqual(order, ['request', 'fetch', 'response']);
  });
});

describe('createApiClient timeouts and aborts', () => {
  it('aborts requests that exceed timeoutMs with code "timeout"', async () => {
    const onError = mock.fn();
    await assert.rejects(client(hangingFetch(), { timeoutMs: 20, onError }).get('/api/slow'), (err) => {
      assert.ok(isApiError(err));
      assert.equal(err.status, 0);
      assert.equal(err.code, 'timeout');
      assert.match(err.message, /20ms/);
      return true;
    });
    assert.equal(onError.mock.callCount(), 1);
  });

  it('does not time out requests that finish in time', async () => {
    const api = client(makeFetch(jsonResponse({ data: 1 })), { timeoutMs: 10_000 });
    assert.deepEqual(await api.get('/x'), { data: 1 });
  });

  it('rethrows a caller abort untouched instead of wrapping it', async () => {
    const controller = new AbortController();
    const onError = mock.fn();
    const pending = client(hangingFetch(), { onError }).get('/api/slow', undefined, { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (err) => {
      assert.equal(err.name, 'AbortError');
      assert.equal(isApiError(err), false);
      return true;
    });
    assert.equal(onError.mock.callCount(), 0);
  });

  it('forwards a caller abort through the timeout signal', async () => {
    const controller = new AbortController();
    const pending = client(hangingFetch(), { timeoutMs: 10_000 }).get('/api/slow', undefined, {
      signal: controller.signal,
    });
    controller.abort(new Error('user cancelled'));
    await assert.rejects(pending, { message: 'user cancelled' });
  });

  it('rejects at once when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      client(hangingFetch(), { timeoutMs: 10_000 }).get('/x', undefined, { signal: controller.signal }),
      { name: 'AbortError' }
    );
  });
});
