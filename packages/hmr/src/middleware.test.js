import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { hmrMiddleware, interceptHtml, toPipelineMiddleware } from './middleware.js';
import { CLIENT_MARKER, ROUTES } from './protocol.js';

const cleanup = [];

afterEach(async () => {
  while (cleanup.length) await cleanup.pop()();
});

const PAGE = '<!doctype html><html><head><title>t</title></head><body><main>hello</main></body></html>';

/**
 * Stand up a tiny app behind the middleware, exactly the way an Express app
 * would use it.
 */
async function start(options, app) {
  const middleware = hmrMiddleware({ watch: false, ...options });
  const server = createServer((req, res) => {
    middleware(req, res, () => app(req, res));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(async () => {
    middleware.close();
    await new Promise((resolve) => server.close(resolve));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, middleware };
}

function htmlApp(req, res) {
  if (req.url === '/json') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/chunked') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.write('<!doctype html><html><body><main>');
    res.write('streamed');
    res.end('</main></body></html>');
    return;
  }
  if (req.url === '/redirect') {
    res.writeHead(302, { location: '/', 'content-type': 'text/html' });
    res.end('<html><body>go</body></html>');
    return;
  }
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(PAGE),
    etag: 'W/"stale"',
  });
  res.end(PAGE);
}

describe('hmrMiddleware in development', () => {
  it('injects the client into an HTML response and fixes content-length', async () => {
    const { base } = await start({ env: { NODE_ENV: 'development' } }, htmlApp);
    const res = await fetch(base + '/');
    const body = await res.text();

    assert.ok(body.includes(ROUTES.client));
    assert.ok(body.includes(CLIENT_MARKER));
    assert.ok(body.indexOf(ROUTES.client) < body.indexOf('</body>'));
    assert.equal(Number(res.headers.get('content-length')), Buffer.byteLength(body));
    assert.equal(res.headers.get('etag'), null, 'a rewritten body must not keep the old ETag');
  });

  it('injects into a response written in several chunks', async () => {
    const { base } = await start({ env: { NODE_ENV: 'development' } }, htmlApp);
    const body = await (await fetch(base + '/chunked')).text();
    assert.ok(body.includes('streamed'));
    assert.ok(body.includes(ROUTES.client));
  });

  it('leaves non-HTML responses byte-for-byte alone', async () => {
    const { base } = await start({ env: { NODE_ENV: 'development' } }, htmlApp);
    const res = await fetch(base + '/json');
    assert.equal(await res.text(), '{"ok":true}');
  });

  it('leaves redirects alone', async () => {
    const { base } = await start({ env: { NODE_ENV: 'development' } }, htmlApp);
    const res = await fetch(base + '/redirect', { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.ok(!(await res.text()).includes(ROUTES.client));
  });

  it('serves the HMR routes itself, without reaching the app', async () => {
    let reached = 0;
    const { base } = await start({ env: { NODE_ENV: 'development' } }, (req, res) => {
      reached++;
      htmlApp(req, res);
    });

    assert.equal((await fetch(base + ROUTES.client)).status, 200);
    assert.equal(reached, 0);
  });
});

describe('hmrMiddleware in production', () => {
  it('is completely inert: no injection, no routes, no rewriting', async () => {
    const { base } = await start({ env: { NODE_ENV: 'production' } }, htmlApp);

    const res = await fetch(base + '/');
    const body = await res.text();
    assert.equal(body, PAGE, 'the production response must be byte-identical');
    assert.ok(!body.includes(CLIENT_MARKER));
    assert.equal(res.headers.get('etag'), 'W/"stale"', 'nothing should have been rewritten');

    for (const route of Object.values(ROUTES)) {
      const probe = await fetch(base + route);
      const probeBody = await probe.text();
      assert.ok(!probeBody.includes(CLIENT_MARKER), `${route} leaked the HMR client in production`);
    }
  });

  it('checks the environment per request, not once at construction', async () => {
    const env = { NODE_ENV: 'development' };
    const { base } = await start({ env }, htmlApp);

    assert.ok((await (await fetch(base + '/')).text()).includes(CLIENT_MARKER));

    env.NODE_ENV = 'production';
    assert.equal(await (await fetch(base + '/')).text(), PAGE);
  });
});

describe('interceptHtml', () => {
  it('passes a body larger than maxBytes straight through', async () => {
    const big = `<!doctype html><html><body>${'x'.repeat(5000)}</body></html>`;
    const server = createServer((req, res) => {
      interceptHtml(res, () => 'REWRITTEN', { maxBytes: 128 });
      res.writeHead(200, { 'content-type': 'text/html' });
      res.write(big.slice(0, 2500));
      res.end(big.slice(2500));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    cleanup.push(() => new Promise((resolve) => server.close(resolve)));

    const body = await (await fetch(`http://127.0.0.1:${server.address().port}/`)).text();
    assert.equal(body, big);
  });

  it('does not let a throwing transform take the response down', async () => {
    const server = createServer((req, res) => {
      interceptHtml(res, () => {
        throw new Error('boom');
      });
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(PAGE);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    cleanup.push(() => new Promise((resolve) => server.close(resolve)));

    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), PAGE);
  });
});

describe('toPipelineMiddleware', () => {
  function ctx(body) {
    return { request: { method: 'GET', url: '/' }, response: { headers: {}, body }, state: {} };
  }

  it('injects into ctx.response.body', async () => {
    const middleware = toPipelineMiddleware({ env: { NODE_ENV: 'development' } });
    const c = ctx(PAGE);
    await middleware(c, async () => {});
    assert.ok(c.response.body.includes(ROUTES.client));
  });

  it('updates content-length when the pipeline set one', async () => {
    const middleware = toPipelineMiddleware({ env: { NODE_ENV: 'development' } });
    const c = ctx(PAGE);
    c.response.headers['content-length'] = String(Buffer.byteLength(PAGE));
    await middleware(c, async () => {});
    assert.equal(c.response.headers['content-length'], String(Buffer.byteLength(c.response.body)));
  });

  it('skips fragments and non-strings', async () => {
    const middleware = toPipelineMiddleware({ env: { NODE_ENV: 'development' } });
    for (const body of ['<li>row</li>', { json: true }, undefined]) {
      const c = ctx(body);
      await middleware(c, async () => {});
      assert.deepEqual(c.response.body, body);
    }
  });

  it('is inert in production', async () => {
    const middleware = toPipelineMiddleware({ env: { NODE_ENV: 'production' } });
    const c = ctx(PAGE);
    await middleware(c, async () => {});
    assert.equal(c.response.body, PAGE);
  });

  it('runs after the downstream handler produced a body', async () => {
    const middleware = toPipelineMiddleware({ env: { NODE_ENV: 'development' } });
    const c = ctx(undefined);
    await middleware(c, async () => {
      c.response.body = PAGE;
    });
    assert.ok(c.response.body.includes(ROUTES.client));
  });
});
