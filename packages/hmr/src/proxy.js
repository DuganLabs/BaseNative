// Built with BaseNative — basenative.dev
/**
 * A dev-only reverse proxy that adds HMR to a server that knows nothing about it.
 *
 * This is what makes `bn dev` work for every project shape the CLI supports —
 * an Express app, a bare `node:http` server, `wrangler dev`. The app keeps
 * listening on an internal port and stays completely unmodified; the proxy
 * owns the public port, injects the client tag into HTML responses, serves the
 * event stream, and watches the tree.
 *
 * It also solves the problem `node --watch` creates: on a server-side change
 * the app is *restarting* at exactly the moment the browser would re-fetch. The
 * proxy waits for the upstream socket to come back before it tells the page
 * anything, so the re-fetch lands on a live server instead of a refused
 * connection and an unnecessary full reload.
 */

import { createServer, request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { assertDevOnly } from './guard.js';
import { injectClientScript } from './inject.js';
import { classifyBatch, UPDATE } from './protocol.js';
import { createHmrServer } from './server.js';
import { createWatcher } from './watcher.js';

/**
 * Is something listening on this port?
 *
 * @param {number} port
 * @param {string} host
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export function isPortOpen(port, host = '127.0.0.1', timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = netConnect({ port, host });
    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/**
 * Resolve once the upstream accepts connections again, or give up.
 *
 * @param {number} port
 * @param {string} host
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function waitForUpstream(port, host = '127.0.0.1', options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const intervalMs = options.intervalMs ?? 60;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (await isPortOpen(port, host)) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** Find a free TCP port, preferring `preferred` and walking upward. */
export async function findFreePort(preferred, host = '127.0.0.1', attempts = 50) {
  for (let port = preferred; port < preferred + attempts; port++) {
    if (!(await isPortOpen(port, host))) return port;
  }
  throw new Error(
    `@basenative/hmr: no free port between ${preferred} and ${preferred + attempts - 1} on ${host}`
  );
}

/** Headers that describe one hop and must not be copied onto a rewritten body. */
const HOP_BY_HOP = ['transfer-encoding', 'connection', 'keep-alive', 'content-encoding'];

const DOWN_PAGE = (target) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Dev server restarting</title></head>
<body><main><h1>Dev server restarting</h1>
<p>Nothing is listening on <code>${target}</code> yet. This page reconnects on its own.</p>
</main></body></html>`;

/**
 * Create the HMR reverse proxy.
 *
 * @param {object} options
 * @param {number} options.targetPort Port the real app listens on.
 * @param {string} [options.targetHost]
 * @param {number} options.port Public port the proxy listens on.
 * @param {string} [options.host]
 * @param {string[]} [options.roots] Directories to watch. Defaults to `[cwd]`.
 * @param {string} [options.cwd]
 * @param {number} [options.settleMs] Grace period before probing the upstream.
 * @param {(message: string) => void} [options.log]
 * @param {Record<string, string | undefined>} [options.env]
 * @returns {{ listen(): Promise<{ port: number, host: string }>, close(): Promise<void>, hmr: object, server: import('node:http').Server }}
 */
export function createHmrProxy(options) {
  assertDevOnly('createHmrProxy', options.env);

  const {
    targetPort,
    targetHost = '127.0.0.1',
    port,
    host = '0.0.0.0',
    roots,
    cwd = process.cwd(),
    ignoredDirs,
    debounceMs = 60,
    settleMs = 120,
    log,
    env,
  } = options;

  if (!targetPort) throw new TypeError('@basenative/hmr: createHmrProxy({ targetPort }) is required');

  // The proxy drives updates itself so it can wait for the app to come back up
  // after `node --watch` restarts it; the core only fans out.
  const hmr = createHmrServer({ watch: false, cwd, log, env });

  const watcher = createWatcher({
    roots: roots ?? [cwd],
    cwd,
    debounceMs,
    ignoredDirs,
    env,
    onWarn: (message, error) => log?.(`${message}: ${error.message}`),
    onChange: async (files) => {
      const kind = classifyBatch(files);
      if (kind !== UPDATE.style) {
        // A server-side edit means `node --watch` is about to tear the app
        // down. Give it a beat to notice, then wait for the socket to reopen.
        await new Promise((resolve) => setTimeout(resolve, settleMs));
        const up = await waitForUpstream(targetPort, targetHost);
        if (!up) {
          log?.(`upstream ${targetHost}:${targetPort} did not come back — asking for a full reload`);
          hmr.notify({ files, kind: UPDATE.hard, reason: 'the dev server did not restart' });
          return;
        }
      }
      hmr.notify({ files, kind });
    },
  });

  hmr.attachWatcher(watcher);

  function proxyRequest(req, res) {
    const headers = { ...req.headers };
    // Take the response uncompressed so the HTML can be rewritten without a
    // decompress/recompress round trip.
    delete headers['accept-encoding'];

    const upstream = httpRequest(
      { host: targetHost, port: targetPort, method: req.method, path: req.url, headers },
      (up) => {
        const type = String(up.headers['content-type'] ?? '');
        const status = up.statusCode ?? 502;
        const rewritable =
          type.includes('html') && !up.headers['content-encoding'] && status >= 200 && status < 300;

        if (!rewritable) {
          res.writeHead(status, up.headers);
          up.pipe(res);
          return;
        }

        const chunks = [];
        up.on('data', (chunk) => chunks.push(chunk));
        up.on('end', () => {
          const html = injectClientScript(Buffer.concat(chunks).toString('utf8'));
          const outHeaders = { ...up.headers };
          // The body was buffered, so the upstream's framing no longer applies:
          // drop chunked transfer-encoding along with the stale length and ETag.
          for (const header of HOP_BY_HOP) delete outHeaders[header];
          delete outHeaders['content-length'];
          delete outHeaders.etag;
          outHeaders['content-length'] = Buffer.byteLength(html);
          outHeaders['cache-control'] = 'no-store';
          res.writeHead(status, outHeaders);
          res.end(html);
        });
        up.on('error', () => res.destroy());
      }
    );

    upstream.on('error', (error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const body = injectClientScript(DOWN_PAGE(`${targetHost}:${targetPort}`));
      res.writeHead(503, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
        'x-bn-hmr-error': error.code ?? 'UPSTREAM_ERROR',
      });
      res.end(body);
    });

    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  }

  function proxyUpgrade(req, socket, head) {
    const upstream = httpRequest({
      host: targetHost,
      port: targetPort,
      method: req.method,
      path: req.url,
      headers: req.headers,
    });

    upstream.on('upgrade', (upRes, upSocket, upHead) => {
      const lines = [`HTTP/1.1 101 ${upRes.statusMessage || 'Switching Protocols'}`];
      for (let i = 0; i < upRes.rawHeaders.length; i += 2) {
        lines.push(`${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}`);
      }
      socket.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (upHead?.length) socket.write(upHead);
      if (head?.length) upSocket.write(head);
      upSocket.pipe(socket).pipe(upSocket);
      upSocket.on('error', () => socket.destroy());
      socket.on('error', () => upSocket.destroy());
    });

    upstream.on('error', () => socket.destroy());
    upstream.end();
  }

  const server = createServer((req, res) => {
    if (hmr.handle(req, res)) return;
    proxyRequest(req, res);
  });
  server.on('upgrade', proxyUpgrade);

  return {
    server,
    hmr,
    watcher,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.removeListener('error', reject);
          const address = server.address();
          resolve({ port: typeof address === 'object' && address ? address.port : port, host });
        });
      });
    },
    close() {
      watcher.close();
      hmr.close();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
