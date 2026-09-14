import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmrProxy, findFreePort, isPortOpen, waitForUpstream } from './proxy.js';
import { CLIENT_MARKER, ROUTES } from './protocol.js';

const DEV = { NODE_ENV: 'development' };
const cleanup = [];

afterEach(async () => {
  while (cleanup.length) await cleanup.pop()();
});

const PAGE =
  '<!doctype html><html><head><title>t</title></head><body><main>upstream</main></body></html>';

async function startUpstream() {
  const server = createServer((req, res) => {
    if (req.url === '/json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"from":"upstream"}');
      return;
    }
    if (req.url === '/echo-header') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(String(req.headers['x-bn-hmr'] ?? ''));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise((resolve) => server.close(resolve)));
  return server.address().port;
}

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'bn-hmr-proxy-'));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function startProxy(targetPort, options = {}) {
  const dir = options.cwd ?? sandbox();
  const proxy = createHmrProxy({
    targetPort,
    port: 0,
    host: '127.0.0.1',
    roots: [dir],
    cwd: dir,
    env: DEV,
    ...options,
  });
  const { port } = await proxy.listen();
  cleanup.push(() => proxy.close());
  return { proxy, base: `http://127.0.0.1:${port}`, dir };
}

describe('createHmrProxy', () => {
  it('injects the client into an upstream HTML response', async () => {
    const upstream = await startUpstream();
    const { base } = await startProxy(upstream);

    const res = await fetch(base + '/');
    const body = await res.text();

    assert.equal(res.status, 200);
    assert.ok(body.includes('upstream'), 'the upstream body must survive');
    assert.ok(body.includes(ROUTES.client));
    assert.ok(body.includes(CLIENT_MARKER));
    assert.equal(Number(res.headers.get('content-length')), Buffer.byteLength(body));
  });

  it('passes non-HTML through untouched', async () => {
    const upstream = await startUpstream();
    const { base } = await startProxy(upstream);
    assert.equal(await (await fetch(base + '/json')).text(), '{"from":"upstream"}');
  });

  it('forwards request headers, including the client re-fetch marker', async () => {
    const upstream = await startUpstream();
    const { base } = await startProxy(upstream);
    const body = await (
      await fetch(base + '/echo-header', { headers: { 'x-bn-hmr': 'patch' } })
    ).text();
    assert.equal(body, 'patch');
  });

  it('serves the HMR routes instead of proxying them', async () => {
    const upstream = await startUpstream();
    const { base } = await startProxy(upstream);
    const res = await fetch(base + ROUTES.client);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /javascript/);
  });

  it('answers with a self-recovering page while the upstream is down', async () => {
    const dead = await findFreePort(61_000);
    const { base } = await startProxy(dead);

    const res = await fetch(base + '/');
    const body = await res.text();

    assert.equal(res.status, 503);
    assert.match(res.headers.get('x-bn-hmr-error'), /^[A-Z_]+$/);
    assert.ok(body.includes('Dev server restarting'));
    assert.ok(
      body.includes(ROUTES.client),
      'the down page must still load the client so it recovers',
    );
  });

  it('pushes an update when a watched file changes', async () => {
    const upstream = await startUpstream();
    const dir = sandbox();
    writeFileSync(join(dir, 'home.html'), '<p>a</p>');
    const { base } = await startProxy(upstream, { cwd: dir, debounceMs: 20, settleMs: 10 });

    const res = await fetch(base + ROUTES.stream);
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

    assert.equal((await nextMessage()).type, 'hello');
    writeFileSync(join(dir, 'home.html'), '<p>b</p>');

    const update = await nextMessage();
    assert.equal(update.type, 'update');
    assert.equal(update.kind, 'soft');
    assert.deepEqual(update.files, ['home.html']);

    await reader.cancel();
  });

  it('reports the watched roots in /__bn_hmr/status', async () => {
    const upstream = await startUpstream();
    const dir = sandbox();
    const { base } = await startProxy(upstream, { cwd: dir });

    const status = await (await fetch(base + ROUTES.status)).json();
    assert.equal(status.enabled, true);
    assert.equal(status.watching, true, 'the proxy watcher must show up in status');
    assert.deepEqual(status.roots, [dir]);
  });

  it('refuses to start in production', () => {
    assert.throws(
      () => createHmrProxy({ targetPort: 1234, port: 0, env: { NODE_ENV: 'production' } }),
      /createHmrProxy\(\) refused to start/,
    );
  });

  it('requires a target port', () => {
    assert.throws(() => createHmrProxy({ port: 0, env: DEV }), /targetPort.*is required/);
  });
});

describe('port helpers', () => {
  it('isPortOpen distinguishes a live listener from a dead port', async () => {
    const upstream = await startUpstream();
    assert.equal(await isPortOpen(upstream), true);
    assert.equal(await isPortOpen(await findFreePort(61_100)), false);
  });

  it('findFreePort walks past a port that is taken', async () => {
    const upstream = await startUpstream();
    const free = await findFreePort(upstream);
    assert.notEqual(free, upstream);
    assert.equal(await isPortOpen(free), false);
  });

  // Test ports sit ABOVE the kernel's ephemeral range (32768–60999 by default
  // on Linux; the WSL box this was diagnosed on uses 44620–48715, which is
  // exactly where the old 45_000–48_000 ports lived). Every probe is a client
  // connect that borrows an ephemeral source port, and a probe whose source
  // port equals the port under test can self-connect on loopback or hold the
  // port at the instant the server binds — so "resolves as soon as the server
  // appears" flaked into a swallowed EADDRINUSE about one run in three.
  it('waitForUpstream resolves as soon as the server appears', async () => {
    const port = await findFreePort(61_200);
    // Resolving true *is* the assertion: the helper only does so by observing
    // the socket open, and it gives up with false at the deadline.
    const waiting = waitForUpstream(port, '127.0.0.1', { timeoutMs: 15_000, intervalMs: 20 });

    const server = createServer((_req, res) => res.end('ok'));
    // A free port can be taken between the probe and the bind; without this the
    // EADDRINUSE would surface as an uncaught exception rather than a failure.
    server.on('error', () => {});
    const timer = setTimeout(() => server.listen(port, '127.0.0.1'), 120);
    cleanup.push(() => {
      clearTimeout(timer);
      return new Promise((resolve) => server.close(resolve));
    });

    assert.equal(await waiting, true);
  });

  it('waitForUpstream gives up rather than hanging forever', async () => {
    const port = await findFreePort(61_300);
    assert.equal(
      await waitForUpstream(port, '127.0.0.1', { timeoutMs: 200, intervalMs: 40 }),
      false,
    );
  });
});
