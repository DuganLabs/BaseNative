import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPipeline } from './pipeline.js';
import { createHonoContext, toHonoMiddleware } from './adapters/hono.js';
import { createFastifyContext, toFastifyPlugin } from './adapters/fastify.js';
import { createCloudflareContext, toCloudflareHandler } from './adapters/cloudflare.js';

// ---------------------------------------------------------------------------
// Hono adapter
// ---------------------------------------------------------------------------

describe('Hono adapter', () => {
  function mockHonoContext(overrides = {}) {
    const url = overrides.url ?? 'http://localhost/test?foo=bar';
    const method = overrides.method ?? 'GET';
    const headersInit = overrides.headers ?? {};
    const rawHeaders = new Headers(headersInit);

    const responseHeaders = {};
    let statusCode;
    let responseBody;

    return {
      req: {
        method,
        url,
        raw: { headers: rawHeaders, body: null },
        param: () => overrides.params ?? {},
      },
      env: overrides.env ?? {},
      header: (k, v) => { responseHeaders[k] = v; },
      status: (code) => { statusCode = code; },
      json: (data) => { responseBody = data; return new Response(JSON.stringify(data)); },
      text: (data) => { responseBody = data; return new Response(data); },
      _getStatus: () => statusCode,
      _getHeaders: () => responseHeaders,
      _getBody: () => responseBody,
    };
  }

  it('creates context from Hono context', () => {
    const c = mockHonoContext({ url: 'http://localhost/api/users?page=1', method: 'POST' });
    const ctx = createHonoContext(c);

    assert.equal(ctx.request.method, 'POST');
    assert.equal(ctx.request.path, '/api/users');
    assert.equal(ctx.request.query.page, '1');
    assert.ok(ctx.response);
    assert.ok(ctx.state);
  });

  it('runs pipeline through Hono middleware', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.state.reached = true;
      ctx.response.headers['x-custom'] = 'hello';
      ctx.response.status = 200;
      ctx.response.body = 'ok';
      await next();
    });

    const c = mockHonoContext();
    const mw = toHonoMiddleware(pipeline);
    await mw(c, async () => {});

    assert.equal(c._getHeaders()['x-custom'], 'hello');
    assert.equal(c._getStatus(), 200);
  });

  it('calls next when no response body is set', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => { ctx.state.ran = true; await next(); });

    const c = mockHonoContext();
    let nextCalled = false;
    const mw = toHonoMiddleware(pipeline);
    await mw(c, async () => { nextCalled = true; });

    assert.ok(nextCalled);
  });

  it('parses cookies from header', () => {
    const c = mockHonoContext({ headers: { cookie: 'session=abc123; theme=dark' } });
    const ctx = createHonoContext(c);

    assert.equal(ctx.request.cookies.session, 'abc123');
    assert.equal(ctx.request.cookies.theme, 'dark');
  });
});

// ---------------------------------------------------------------------------
// Fastify adapter
// ---------------------------------------------------------------------------

describe('Fastify adapter', () => {
  function mockFastifyRequest(overrides = {}) {
    return {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/test?foo=bar',
      headers: overrides.headers ?? {},
      query: overrides.query ?? { foo: 'bar' },
      body: overrides.body ?? undefined,
      params: overrides.params ?? {},
      ip: overrides.ip ?? '127.0.0.1',
      raw: { socket: { remoteAddress: '127.0.0.1' } },
      routeOptions: { url: overrides.routePath ?? '/test' },
    };
  }

  function mockFastifyReply() {
    const state = { code: 200, headers: {}, body: undefined };
    return {
      code: (c) => { state.code = c; return state._self; },
      header: (k, v) => { state.headers[k] = v; return state._self; },
      send: (body) => { state.body = body; return state._self; },
      _state: state,
      get _self() { return state._self; },
    };
  }

  it('creates context from Fastify request/reply', () => {
    const request = mockFastifyRequest({ method: 'POST', url: '/api/data?page=2', query: { page: '2' } });
    const reply = mockFastifyReply();
    const ctx = createFastifyContext(request, reply);

    assert.equal(ctx.request.method, 'POST');
    assert.equal(ctx.request.query.page, '2');
    assert.equal(ctx.request.ip, '127.0.0.1');
    assert.ok(ctx.response);
    assert.ok(ctx.state);
  });

  it('registers as a Fastify plugin with preHandler hook', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.response.headers['x-test'] = 'yes';
      ctx.response.status = 200;
      ctx.response.body = { ok: true };
      await next();
    });

    const plugin = toFastifyPlugin(pipeline);

    // Simulate Fastify instance
    let registeredHook;
    const fastify = {
      addHook: (name, fn) => {
        assert.equal(name, 'preHandler');
        registeredHook = fn;
      },
    };

    let doneCalled = false;
    plugin(fastify, {}, () => { doneCalled = true; });
    assert.ok(doneCalled, 'done() should be called');
    assert.ok(registeredHook, 'preHandler hook should be registered');

    // Run the hook
    const request = mockFastifyRequest();
    const reply = mockFastifyReply();
    // Wire up self-reference for chaining
    reply._state._self = reply;
    await registeredHook(request, reply);

    assert.equal(reply._state.headers['x-test'], 'yes');
    assert.equal(reply._state.code, 200);
    assert.deepEqual(reply._state.body, { ok: true });
  });

  it('parses cookies from header', () => {
    const request = mockFastifyRequest({ headers: { cookie: 'token=xyz; lang=en' } });
    const reply = mockFastifyReply();
    const ctx = createFastifyContext(request, reply);

    assert.equal(ctx.request.cookies.token, 'xyz');
    assert.equal(ctx.request.cookies.lang, 'en');
  });
});

// ---------------------------------------------------------------------------
// Cloudflare Workers adapter
// ---------------------------------------------------------------------------

describe('Cloudflare Workers adapter', () => {
  it('creates context from standard Request', () => {
    const request = new Request('https://example.com/api/data?key=value', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'sid=abc' },
    });
    const env = { MY_KV: {} };
    const executionCtx = { waitUntil: () => {} };
    const ctx = createCloudflareContext(request, env, executionCtx);

    assert.equal(ctx.request.method, 'POST');
    assert.equal(ctx.request.path, '/api/data');
    assert.equal(ctx.request.query.key, 'value');
    assert.equal(ctx.request.cookies.sid, 'abc');
    assert.equal(ctx.env, env);
    assert.equal(ctx.executionCtx, executionCtx);
    assert.ok(ctx.state);
  });

  it('returns a Response from the handler', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.response.status = 200;
      ctx.response.headers['x-powered-by'] = 'BaseNative';
      ctx.response.body = { message: 'hello' };
      await next();
    });

    const handler = toCloudflareHandler(pipeline);
    const request = new Request('https://example.com/test');
    const env = {};
    const executionCtx = { waitUntil: () => {} };

    const response = await handler(request, env, executionCtx);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-powered-by'), 'BaseNative');
    assert.equal(response.headers.get('content-type'), 'application/json');
    const body = await response.json();
    assert.deepEqual(body, { message: 'hello' });
  });

  it('returns text response for string body', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.response.status = 200;
      ctx.response.body = 'plain text';
      await next();
    });

    const handler = toCloudflareHandler(pipeline);
    const request = new Request('https://example.com/test');
    const response = await handler(request, {}, { waitUntil: () => {} });

    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text, 'plain text');
  });

  it('returns empty response when no body is set', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => { await next(); });

    const handler = toCloudflareHandler(pipeline);
    const request = new Request('https://example.com/test');
    const response = await handler(request, {}, { waitUntil: () => {} });

    assert.equal(response.status, 200);
  });
});
