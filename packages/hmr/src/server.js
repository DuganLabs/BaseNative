// Built with BaseNative — basenative.dev
/**
 * The server half: file watcher, SSE fan-out, and the four static modules the
 * browser half is assembled from.
 *
 * Nothing here holds a reference to your app. It answers the `/__bn_hmr/*`
 * routes and nothing else, so it composes with any Node HTTP server — the
 * reverse proxy in `proxy.js`, an Express app via `hmrMiddleware()`, or a bare
 * `http.createServer` handler.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyBatch, ROUTES, UPDATE } from './protocol.js';
import { isDevEnvironment } from './guard.js';
import { createWatcher } from './watcher.js';

/**
 * The exact set of files that may leave this directory over HTTP. An explicit
 * map rather than a path join: there is no input that can walk out of it.
 */
const ASSETS = new Map([
  [ROUTES.client, 'client.js'],
  [ROUTES.patch, 'patch.js'],
  [ROUTES.preserve, 'preserve.js'],
  [ROUTES.protocol, 'protocol.js'],
]);

const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};

const JS_HEADERS = {
  'content-type': 'text/javascript; charset=utf-8',
  'cache-control': 'no-store',
};

/** Heartbeat interval; keeps proxies from reaping an idle event stream. */
const PING_MS = 20_000;

function pathOf(url) {
  const index = url.indexOf('?');
  return index === -1 ? url : url.slice(0, index);
}

/**
 * Create the HMR server core.
 *
 * @param {object} [options]
 * @param {string[]} [options.roots] Directories to watch. Defaults to `[cwd]`.
 * @param {string} [options.cwd]
 * @param {number} [options.debounceMs]
 * @param {string[]} [options.ignoredDirs]
 * @param {boolean} [options.watch] Set false to drive updates only via `notify()`.
 * @param {(message: string) => void} [options.log]
 * @param {Record<string, string | undefined>} [options.env]
 * @returns {{
 *   handle(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse): boolean,
 *   notify(detail?: object): void,
 *   status(): object,
 *   close(): void,
 *   readonly clients: number,
 *   readonly generation: string,
 *   readonly enabled: boolean
 * }}
 */
export function createHmrServer(options = {}) {
  const {
    roots,
    cwd = process.cwd(),
    debounceMs = 60,
    ignoredDirs,
    watch: shouldWatch = true,
    log,
    env,
  } = options;

  // The generation changes every boot. A client that reconnects and sees a new
  // one knows the dev server restarted underneath it.
  const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clients = new Set();
  const startedAt = Date.now();

  let updates = 0;
  let lastUpdate = null;
  let closed = false;

  function broadcast(payload) {
    const frame = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
      try {
        res.write(frame);
      } catch {
        clients.delete(res);
      }
    }
  }

  /**
   * Push an update to every connected page.
   *
   * @param {{ files?: string[], kind?: 'soft'|'style'|'hard', reason?: string }} [detail]
   */
  function notify(detail = {}) {
    if (closed) return;
    const files = detail.files ?? [];
    const kind = detail.kind ?? (files.length ? classifyBatch(files) : UPDATE.soft);
    updates++;
    lastUpdate = { at: Date.now(), kind, files, reason: detail.reason ?? null };
    log?.(`${kind} update · ${files.length ? files.join(', ') : 'manual'}`);
    broadcast({ type: 'update', kind, files, reason: detail.reason ?? null });
  }

  const watcher =
    shouldWatch && isDevEnvironment(env)
      ? createWatcher({
          roots: roots ?? [cwd],
          cwd,
          debounceMs,
          ignoredDirs,
          env,
          onChange: (files) => notify({ files }),
          onWarn: (message, error) => log?.(`${message}: ${error.message}`),
        })
      : null;

  const heartbeat = setInterval(() => {
    if (clients.size === 0) return;
    broadcast({ type: 'ping', at: Date.now() });
  }, PING_MS);
  heartbeat.unref?.();

  function openStream(res, req) {
    res.writeHead(200, SSE_HEADERS);
    res.write(`retry: 1000\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'hello', generation, since: startedAt })}\n\n`);
    res.flushHeaders?.();
    clients.add(res);

    const drop = () => {
      clients.delete(res);
    };
    req.on('close', drop);
    req.on('error', drop);
    res.on('close', drop);
    res.on('error', drop);
  }

  function status() {
    return {
      enabled: isDevEnvironment(env),
      generation,
      startedAt,
      clients: clients.size,
      updates,
      lastUpdate,
      watching: watcher?.watching ?? false,
      roots: watcher?.roots ?? [],
    };
  }

  /**
   * Answer an HMR route.
   *
   * @returns {boolean} true when the request was handled and the caller must stop.
   */
  function handle(req, res) {
    if (!isDevEnvironment(env)) return false;
    const path = pathOf(req.url ?? '');

    const asset = ASSETS.get(path);
    if (asset) {
      let source;
      try {
        source = readFileSync(join(import.meta.dirname, asset), 'utf8');
      } catch (error) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`@basenative/hmr could not read ${asset}: ${error.message}`);
        return true;
      }
      res.writeHead(200, JS_HEADERS);
      res.end(source);
      return true;
    }

    if (path === ROUTES.stream) {
      openStream(res, req);
      return true;
    }

    if (path === ROUTES.status) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(status()));
      return true;
    }

    return false;
  }

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    watcher?.close();
    for (const res of clients) {
      try {
        res.end();
      } catch {
        /* already gone */
      }
    }
    clients.clear();
  }

  return {
    handle,
    notify,
    status,
    close,
    get clients() {
      return clients.size;
    },
    get generation() {
      return generation;
    },
    get enabled() {
      return isDevEnvironment(env);
    },
  };
}
