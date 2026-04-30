import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPipeline, compose } from './pipeline.js';
import { cors } from './builtins/cors.js';
import { rateLimit } from './builtins/rate-limit.js';
import { csrf } from './builtins/csrf.js';
import { logger } from './builtins/logger.js';
import { createExpressContext, toExpressMiddleware } from './adapters/express.js';

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
    pipeline.use(async (_ctx, next) => {
      order.push(1);
      await next();
      order.push(3);
    });
    pipeline.use(async (_ctx, next) => {
      order.push(2);
      await next();
    });
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
    pipeline.use(async () => {
      order.push(1);
    });
    pipeline.use(async () => {
      order.push(2);
    });
    await pipeline.run(createCtx());
    assert.deepEqual(order, [1]);
  });

  it('passes context through middleware chain', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.state.user = 'alice';
      await next();
    });
    pipeline.use(async (ctx, next) => {
      ctx.state.greeting = `hello ${ctx.state.user}`;
      await next();
    });
    const ctx = createCtx();
    await pipeline.run(ctx);
    assert.equal(ctx.state.greeting, 'hello alice');
  });
});

describe('compose', () => {
  it('composes multiple middleware into one', async () => {
    const order = [];
    const composed = compose(
      async (_ctx, next) => {
        order.push('a');
        await next();
      },
      async (_ctx, next) => {
        order.push('b');
        await next();
      },
    );
    const ctx = createCtx();
    await composed(ctx, async () => {
      order.push('c');
    });
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
    await mw(ctx, async () => {
      nextCalled = true;
    });
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
    await mw(postCtx, async () => {
      nextCalled = true;
    });
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
    const mw = logger({
      output: (msg) => logs.push(msg),
      skip: (ctx) => ctx.request.url === '/health',
    });
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
    pipeline.use(async () => {
      throw new Error('boom');
    });
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

describe('rateLimit — additional', () => {
  it('sets x-ratelimit-limit header', async () => {
    const mw = rateLimit({ max: 5, windowMs: 60000 });
    const ctx = createCtx({ request: { method: 'GET', ip: '1.1.1.1', headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['x-ratelimit-limit'], '5');
  });

  it('decrements x-ratelimit-remaining with each request', async () => {
    const mw = rateLimit({ max: 10, windowMs: 60000 });
    const ctx1 = createCtx({ request: { method: 'GET', ip: '2.2.2.2', headers: {} } });
    const ctx2 = createCtx({ request: { method: 'GET', ip: '2.2.2.2', headers: {} } });
    await mw(ctx1, async () => {});
    await mw(ctx2, async () => {});
    assert.equal(ctx1.response.headers['x-ratelimit-remaining'], '9');
    assert.equal(ctx2.response.headers['x-ratelimit-remaining'], '8');
  });

  it('uses custom keyGenerator', async () => {
    const keys = [];
    const mw = rateLimit({
      max: 100,
      keyGenerator: (ctx) => {
        const k = ctx.request.headers['x-user-id'];
        keys.push(k);
        return k;
      },
    });
    const ctx = createCtx({ request: { method: 'GET', headers: { 'x-user-id': 'user-42' } } });
    await mw(ctx, async () => {});
    assert.deepEqual(keys, ['user-42']);
  });

  it('sets retry-after header on 429', async () => {
    const mw = rateLimit({ max: 1, windowMs: 60000 });
    const ip = '3.3.3.3';
    // First request is fine
    await mw(createCtx({ request: { method: 'GET', ip, headers: {} } }), async () => {});
    // Second request is fine (max=1, count becomes 2)
    const ctx = createCtx({ request: { method: 'GET', ip, headers: {} } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 429);
    assert.ok(ctx.response.headers['retry-after']);
  });
});

describe('csrf — additional', () => {
  it('HEAD request is not blocked (passes through)', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'HEAD', headers: {} } });
    let nextCalled = false;
    await mw(ctx, async () => {
      nextCalled = true;
    });
    // HEAD is safe method — should call next
    assert.ok(nextCalled);
  });

  it('generates token on GET and stores in session', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'GET', headers: {} } });
    await mw(ctx, async () => {});
    assert.ok(typeof ctx.state.csrfToken === 'string' && ctx.state.csrfToken.length > 0);
  });

  it('reuses existing token from cookie without regenerating', async () => {
    const mw = csrf();
    const existingToken = 'abc123existing';
    const ctx = createCtx({
      request: { method: 'GET', cookies: { _csrf: existingToken } },
    });
    await mw(ctx, async () => {});
    assert.equal(ctx.state.csrfToken, existingToken);
    assert.equal(ctx.state.csrfTokenGenerated, undefined);
  });

  it('accepts POST with token from request body field', async () => {
    const mw = csrf();
    const token = 'bodytoken123';
    const ctx = createCtx({
      request: {
        method: 'POST',
        headers: {},
        cookies: { _csrf: token },
        body: { _csrf: token },
      },
    });
    let nextCalled = false;
    await mw(ctx, async () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
  });

  it('OPTIONS request passes through without token', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'OPTIONS', headers: {} } });
    let nextCalled = false;
    await mw(ctx, async () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
  });

  it('sets response cookie when token is newly generated', async () => {
    const mw = csrf();
    const ctx = createCtx({ request: { method: 'GET', headers: {}, cookies: {} } });
    await mw(ctx, async () => {});
    assert.ok(ctx.response.cookies);
    assert.ok(ctx.response.cookies['_csrf']);
    assert.equal(ctx.response.cookies['_csrf'].httpOnly, false);
  });
});

describe('cors — additional 2', () => {
  it('echoes access-control-request-headers in preflight when no allowedHeaders set', async () => {
    const mw = cors();
    const ctx = createCtx({
      request: {
        method: 'OPTIONS',
        headers: { 'access-control-request-headers': 'x-custom-header, content-type' },
      },
    });
    await mw(ctx, async () => {});
    assert.equal(
      ctx.response.headers['access-control-allow-headers'],
      'x-custom-header, content-type',
    );
  });

  it('uses allowedHeaders instead of request header when both present', async () => {
    const mw = cors({ allowedHeaders: ['authorization'] });
    const ctx = createCtx({
      request: {
        method: 'OPTIONS',
        headers: { 'access-control-request-headers': 'x-custom-header' },
      },
    });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.headers['access-control-allow-headers'], 'authorization');
  });

  it('does not call next on OPTIONS (returns early)', async () => {
    const mw = cors();
    const ctx = createCtx({ request: { method: 'OPTIONS', headers: {} } });
    let nextCalled = false;
    await mw(ctx, async () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
  });
});

describe('rateLimit — additional 2', () => {
  it('sets x-ratelimit-reset header', async () => {
    const mw = rateLimit({ max: 5, windowMs: 60000 });
    const ctx = createCtx({ request: { ip: '9.9.9.9' } });
    await mw(ctx, async () => {});
    assert.ok(ctx.response.headers['x-ratelimit-reset']);
    assert.match(ctx.response.headers['x-ratelimit-reset'], /^\d+$/);
  });

  it('responds with custom message on 429', async () => {
    const mw = rateLimit({ max: 0, windowMs: 60000, message: 'Slow down!' });
    const ctx = createCtx({ request: { ip: '10.10.10.10' } });
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 429);
    assert.equal(ctx.response.body, 'Slow down!');
  });
});

describe('logger — additional', () => {
  it('logs status 500 in text format', async () => {
    const logs = [];
    const mw = logger({ output: (msg) => logs.push(msg) });
    const ctx = createCtx({ request: { method: 'GET', url: '/crash' } });
    ctx.response.status = 500;
    await mw(ctx, async () => {});
    assert.ok(logs[0].includes('500'));
    assert.ok(logs[0].includes('/crash'));
  });

  it('defaults to status 200 when response status is not set', async () => {
    const logs = [];
    const mw = logger({ output: (msg) => logs.push(msg), json: true });
    const ctx = createCtx({ request: { method: 'GET', url: '/ok' } });
    await mw(ctx, async () => {});
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.status, 200);
  });
});

describe('createPipeline — toHandler', () => {
  it('toHandler returns run function', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.state.ran = true;
      await next();
    });
    const handler = pipeline.toHandler();
    const ctx = createCtx();
    await handler(ctx);
    assert.equal(ctx.state.ran, true);
  });

  it('use is chainable', () => {
    const pipeline = createPipeline();
    const result = pipeline.use(async (_ctx, next) => next());
    assert.equal(result, pipeline);
  });

  it('stack getter returns copy of middleware array', () => {
    const pipeline = createPipeline();
    pipeline.use(async (_ctx, next) => next());
    const stack = pipeline.stack;
    assert.equal(stack.length, 1);
    // Mutating the copy does not affect the pipeline
    stack.push(() => {});
    assert.equal(pipeline.stack.length, 1);
  });
});

describe('compose — additional', () => {
  it('single middleware still calls outer next', async () => {
    let outerNextCalled = false;
    const composed = compose(async (_ctx, next) => {
      await next();
    });
    await composed(createCtx(), async () => {
      outerNextCalled = true;
    });
    assert.ok(outerNextCalled);
  });

  it('accepts an array of middlewares', async () => {
    const order = [];
    const composed = compose([
      async (_ctx, next) => {
        order.push(1);
        await next();
      },
      async (_ctx, next) => {
        order.push(2);
        await next();
      },
    ]);
    await composed(createCtx(), async () => {
      order.push(3);
    });
    assert.deepEqual(order, [1, 2, 3]);
  });
});

describe('Express adapter', () => {
  function mockExpressReq(overrides = {}) {
    return {
      method: overrides.method ?? 'GET',
      originalUrl: overrides.url ?? '/test?x=1',
      path: overrides.path ?? '/test',
      headers: overrides.headers ?? {},
      cookies: overrides.cookies ?? {},
      query: overrides.query ?? { x: '1' },
      body: overrides.body ?? undefined,
      ip: overrides.ip ?? '127.0.0.1',
      params: overrides.params ?? {},
    };
  }

  it('creates context from Express req', () => {
    const req = mockExpressReq({ method: 'POST', url: '/api/data', path: '/api/data', query: {} });
    const res = { setHeader: () => {}, status: () => ({}), send: () => {}, cookie: () => {} };
    const ctx = createExpressContext(req, res);
    assert.equal(ctx.request.method, 'POST');
    assert.equal(ctx.request.path, '/api/data');
    assert.equal(ctx.request.ip, '127.0.0.1');
    assert.ok(ctx.response);
    assert.ok(ctx.state);
  });

  it('parses cookies from cookie header when req.cookies is absent', () => {
    const req = {
      method: 'GET',
      originalUrl: '/test',
      path: '/test',
      headers: { cookie: 'a=1; b=2' },
      cookies: undefined,
      query: {},
      body: undefined,
      ip: '1.1.1.1',
      params: {},
    };
    const ctx = createExpressContext(req, {});
    assert.equal(ctx.request.cookies.a, '1');
    assert.equal(ctx.request.cookies.b, '2');
  });

  it('toExpressMiddleware calls next when no body is set', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.state.ran = true;
      await next();
    });
    const mw = toExpressMiddleware(pipeline);

    let nextCalled = false;
    const req = mockExpressReq();
    const res = { setHeader: () => {}, status: () => ({}), send: () => {}, cookie: () => {} };
    await mw(req, res, () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
  });

  it('toExpressMiddleware sends response when body is set', async () => {
    const pipeline = createPipeline();
    pipeline.use(async (ctx, next) => {
      ctx.response.status = 201;
      ctx.response.body = { created: true };
      await next();
    });
    const mw = toExpressMiddleware(pipeline);

    let sentBody;
    let sentCode;
    const res = {
      setHeader: () => {},
      status: (code) => {
        sentCode = code;
        return res;
      },
      send: (body) => {
        sentBody = body;
      },
      cookie: () => {},
    };
    await mw(mockExpressReq(), res, () => {});
    assert.equal(sentCode, 201);
    assert.deepEqual(sentBody, { created: true });
  });

  it('toExpressMiddleware calls next(err) on pipeline error', async () => {
    const pipeline = createPipeline();
    pipeline.use(async () => {
      throw new Error('pipeline failed');
    });
    const mw = toExpressMiddleware(pipeline);

    let caughtErr;
    const res = { setHeader: () => {}, status: () => res, send: () => {}, cookie: () => {} };
    await mw(mockExpressReq(), res, (err) => {
      caughtErr = err;
    });
    assert.ok(caughtErr instanceof Error);
    assert.match(caughtErr.message, /pipeline failed/);
  });
});
