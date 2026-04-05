import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPipeline, compose } from './pipeline.js';
import { cors } from './builtins/cors.js';
import { rateLimit } from './builtins/rate-limit.js';
import { csrf } from './builtins/csrf.js';
import { logger } from './builtins/logger.js';

function createCtx(overrides = {}) {
  return {
    request: {
      method: 'GET',
      url: '/test',
      path: '/test',
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      ...overrides.request,
    },
    response: {
      status: undefined,
      headers: {},
      body: undefined,
      ...overrides.response,
    },
    state: {},
  };
}

describe('createPipeline', () => {
  it('runs middleware in order', async () => {
    const order = [];
    const pipeline = createPipeline();
    pipeline.use(async (_ctx, next) => { order.push(1); await next(); order.push(3); });
    pipeline.use(async (_ctx, next) => { order.push(2); await next(); });
    await pipeline.run(createCtx());
    assert.deepEqual(order, [1, 2, 3]);
  });

  it('throws for non-function middleware', () => {
    const pipeline = createPipeline();
    assert.throws(() => pipeline.use('not a function'), /Middleware must be a function/);
  });

  it('stops chain when next is not called', async () => {
    const order = [];
    const pipeline = createPipeline();
    pipeline.use(async () => { order.push(1); });
    pipeline.use(async () => { order.push(2); });
    await pipeline.run(createCtx());
    assert.deepEqual(order, [1]);
  });

  it('passes context through middleware chain', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => { ctx.state.user = 'alice'; await next(); });
    pipeline.use(async (ctx, next) => { ctx.state.greeting = `hello ${ctx.state.user}`; await next(); });
    const ctx = createCtx();
    await pipeline.run(ctx);
    assert.equal(ctx.state.greeting, 'hello alice');
  });
});

describe('compose', () => {
  it('composes multiple middleware into one', async () => {
    const order = [];
    const composed = compose(
      async (_ctx, next) => { order.push('a'); await next(); },
      async (_ctx, next) => { order.push('b'); await next(); },
    );
    const ctx = createCtx();
    await composed(ctx, async () => { order.push('c'); });
    assert.deepEqual(order, ['a', 'b', 'c']);
  });
});

describe('cors', () => {
  it('sets wildcard origin by default', async () => {
    const mw = cors();
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-origin'], '*');
  });

  it('reflects origin from allowlist', async () => {
    const mw = cors({ origin: ['https://example.com'] });
    const ctx = createCtx({ request: { headers: { origin: 'https://example.com' } } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-origin'], 'https://example.com');
  });

  it('handles preflight OPTIONS requests', async () => {
    const mw = cors({ maxAge: 600 });
    const ctx = createCtx({ request: { method: 'OPTIONS', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 204);
    assert.equal(ctx.response.headers['access-control-max-age'], '600');
  });

  it('sets credentials header', async () => {
    const mw = cors({ credentials: true });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-credentials'], 'true');
  });
});

describe('rateLimit', () => {
  it('allows requests within limit', async () => {
    const mw = rateLimit({ max: 5, windowMs: 10000 });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['x-ratelimit-limit'], '5');
    assert.equal(ctx.response.headers['x-ratelimit-remaining'], '4');
    assert.notEqual(ctx.response.status, 429);
  });

  it('blocks requests exceeding limit', async () => {
    const mw = rateLimit({ max: 2, windowMs: 10000 });
    for (let i = 0; i < 2; i++) {
      const ctx = createCtx();
      await mw(ctx, async () => {});
    }
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 429);
    assert.ok(ctx.response.headers['retry-after']);
  });
});

describe('csrf', () => {
  it('generates token for GET requests', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'GET' } });
    let nextCalled = false;
    await mw(ctx, async () => { nextCalled = true; });
    assert.ok(ctx.state.csrfToken);
    assert.ok(nextCalled);
  });

  it('rejects POST without token', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'POST', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 403);
  });

  it('accepts POST with valid token', async () => {
    const mw = csrf();
    // First, get a token via GET
    const getCtx = createCtx({ request: { method: 'GET' } });
    await mw(getCtx, async () => {});
    const token = getCtx.state.csrfToken;

    // Then POST with the token
    const postCtx = createCtx({
      request: {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        cookies: { _csrf: token },
      },
    });
    let nextCalled = false;
    await mw(postCtx, async () => { nextCalled = true; });
    assert.ok(nextCalled);
  });
});

describe('logger', () => {
  it('logs request details', async () => {
    const logs = [];
    const mw = logger({ output: (msg) => logs.push(msg) });
    const ctx = createCtx({ request: { method: 'GET', url: '/api/test' } });
    await mw(ctx, async () => {});
    assert.equal(logs.length, 1);
    assert.ok(logs[0].includes('GET'));
    assert.ok(logs[0].includes('/api/test'));
  });

  it('logs JSON format', async () => {
    const logs = [];
    const mw = logger({ output: (msg) => logs.push(msg), json: true });
    const ctx = createCtx({ request: { method: 'POST', url: '/api/data' } });
    ctx.response.status = 201;
    await mw(ctx, async () => {});
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.method, 'POST');
    assert.equal(parsed.url, '/api/data');
    assert.equal(parsed.status, 201);
    assert.ok(parsed.duration >= 0);
  });

  it('skips logging when skip function returns true', async () => {
    const logs = [];
    const mw = logger({ output: (msg) => logs.push(msg), skip: (ctx) => ctx.request.url === '/health' });
    const ctx = createCtx({ request: { url: '/health' } });
    await mw(ctx, async () => {});
    assert.equal(logs.length, 0);
  });
});

describe('createPipeline — additional', () => {
  it('run resolves even with empty pipeline', async () => {
    const pipeline = createPipeline();
    await assert.doesNotReject(() => pipeline.run(createCtx()));
  });

  it('error thrown inside middleware propagates', async () => {
    const pipeline = createPipeline();
    pipeline.use(async () => { throw new Error('boom'); });
    await assert.rejects(() => pipeline.run(createCtx()), /boom/);
  });

  it('context modifications after await next() are visible', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      await next();
      ctx.state.after = true; // set AFTER inner middleware
    });
    pipeline.use(async (ctx, next) => {
      ctx.state.inner = true;
      await next();
    });
    const ctx = createCtx();
    await pipeline.run(ctx);
    assert.equal(ctx.state.inner, true);
    assert.equal(ctx.state.after, true);
  });
});

describe('cors — additional', () => {
  it('uses function-based origin', async () => {
    const mw = cors({ origin: (origin) => origin.endsWith('.example.com') });
    const ctx = createCtx({ request: { headers: { origin: 'https://app.example.com' } } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-origin'], 'https://app.example.com');
  });

  it('rejects origin not in function allowlist', async () => {
    const mw = cors({ origin: (origin) => origin === 'https://allowed.com' });
    const ctx = createCtx({ request: { headers: { origin: 'https://evil.com' } } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-origin'], undefined);
  });

  it('exposes listed headers', async () => {
    const mw = cors({ exposedHeaders: ['x-request-id', 'x-trace'] });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.match(ctx.response.headers['access-control-expose-headers'], /x-request-id/);
    assert.match(ctx.response.headers['access-control-expose-headers'], /x-trace/);
  });

  it('preflight sets access-control-allow-methods', async () => {
    const mw = cors({ methods: ['GET', 'POST'] });
    const ctx = createCtx({ request: { method: 'OPTIONS', headers: {} } });
    await mw(ctx, async () => {});
    assert.match(ctx.response.headers['access-control-allow-methods'], /GET/);
    assert.match(ctx.response.headers['access-control-allow-methods'], /POST/);
  });
});

describe('csrf — additional', () => {
  it('rejects PUT request without token', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'PUT', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 403);
  });

  it('rejects PATCH request without token', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'PATCH', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 403);
  });

  it('rejects DELETE request without token', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'DELETE', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 403);
  });
});
