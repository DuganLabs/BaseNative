import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmrServer } from './server.js';
import { ROUTES } from './protocol.js';

const cleanup = [];

afterEach(async () => {
  while (cleanup.length) {
    const fn = cleanup.pop();
    await fn();
  }
});

/** Start a bare http server whose only job is to let the HMR core answer. */
async function start(options = {}) {
  const hmr = createHmrServer({ watch: false, env: { NODE_ENV: 'development' }, ...options });
  const server = createServer((req, res) => {
    if (hmr.handle(req, res)) return;
    res.writeHead(404).end('nope');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  cleanup.push(async () => {
    hmr.close();
    await new Promise((resolve) => server.close(resolve));
  });
  return { hmr, base };
}

describe('HMR asset routes', () => {
  it('serves the four browser modules as JavaScript', async () => {
    const { base } = await start();
    for (const route of [ROUTES.client, ROUTES.patch, ROUTES.preserve, ROUTES.protocol]) {
      const res = await fetch(base + route);
      assert.equal(res.status, 200, route);
      assert.match(res.headers.get('content-type'), /javascript/, route);
      const body = await res.text();
      assert.ok(body.length > 0, route);
      assert.ok(
        !/^\s*import[^\n]*['"]node:/m.test(body),
        `${route} must not leak a node: import to the browser`
      );
    }
  });

  it('the client module is a real ES module whose imports all resolve to served routes', async () => {
    const { base } = await start();
    const body = await (await fetch(base + ROUTES.client)).text();
    assert.match(body, /^import /m);

    const served = new Set(Object.values(ROUTES).map((route) => route.split('/').pop()));
    for (const match of body.matchAll(/^import[^\n]*from\s+'(\.\/[^']+)'/gm)) {
      assert.ok(
        served.has(match[1].slice(2)),
        `${match[1]} is imported by the client but is not served`
      );
    }
  });

  it('does not serve anything outside the allowlist', async () => {
    const { base } = await start();
    for (const path of ['/__bn_hmr/server.js', '/__bn_hmr/../package.json', '/__bn_hmr/']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 404, path);
    }
  });

  it('ignores a query string on a route', async () => {
    const { base } = await start();
    assert.equal((await fetch(`${base}${ROUTES.client}?v=2`)).status, 200);
  });
});

describe('status route', () => {
  it('reports the generation, client count, and watch state', async () => {
    const { base, hmr } = await start();
    const status = await (await fetch(base + ROUTES.status)).json();
    assert.equal(status.enabled, true);
    assert.equal(status.generation, hmr.generation);
    assert.equal(status.clients, 0);
    assert.equal(status.watching, false);
    assert.equal(status.updates, 0);
  });
});

describe('the event stream', () => {
  it('greets a new client with hello + generation, then pushes updates', async () => {
    const { base, hmr } = await start();
    const res = await fetch(base + ROUTES.stream);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    async function nextMessage() {
      for (;;) {
        const index = buffer.indexOf('\n\n');
        if (index !== -1) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (line) return JSON.parse(line.slice(6));
          continue;
        }
        const { value, done } = await reader.read();
        if (done) throw new Error('stream closed');
        buffer += decoder.decode(value, { stream: true });
      }
    }

    const hello = await nextMessage();
    assert.equal(hello.type, 'hello');
    assert.equal(hello.generation, hmr.generation);

    hmr.notify({ files: ['views/home.html'] });
    const update = await nextMessage();
    assert.equal(update.type, 'update');
    assert.equal(update.kind, 'soft');
    assert.deepEqual(update.files, ['views/home.html']);

    hmr.notify({ files: ['public/app.css'] });
    assert.equal((await nextMessage()).kind, 'style');

    hmr.notify({ files: ['public/app.js'] });
    assert.equal((await nextMessage()).kind, 'hard');

    await reader.cancel();
  });

  it('counts connected clients and forgets them on disconnect', async () => {
    const { base, hmr } = await start();
    const controller = new AbortController();
    const res = await fetch(base + ROUTES.stream, { signal: controller.signal });
    const reader = res.body.getReader();
    await reader.read();

    assert.equal(hmr.clients, 1);
    controller.abort();

    const deadline = Date.now() + 2000;
    while (hmr.clients !== 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(hmr.clients, 0);
  });
});

describe('the production guard', () => {
  it('handles nothing at all when NODE_ENV=production', async () => {
    const { base, hmr } = await start({ env: { NODE_ENV: 'production' } });
    assert.equal(hmr.enabled, false);
    for (const route of Object.values(ROUTES)) {
      const res = await fetch(base + route);
      assert.equal(res.status, 404, `${route} must not be served in production`);
    }
  });

  it('never starts a watcher in production', async () => {
    const { hmr } = await start({ watch: true, env: { NODE_ENV: 'production' } });
    assert.equal(hmr.status().watching, false);
  });
});
