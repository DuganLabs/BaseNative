// Built with BaseNative — basenative.dev
/**
 * The browser half of `@basenative/hmr`.
 *
 * Served as a same-origin ES module at `/__bn_hmr/client.js` and loaded with a
 * plain `<script type="module" src>` tag, so it runs untouched under
 * `script-src 'self'` — the CSP the BaseNative runtime already assumes
 * (`docs/guides/security.md`). There is no inline script, no `eval`, no
 * `new Function`, and no inline event handler anywhere in this package.
 *
 * Every route it talks to is derived from `import.meta.url`, so mounting the
 * dev server under a path prefix needs no configuration here.
 */

import { parseDocument, patchDocument } from './patch.js';
import { capture, restore } from './preserve.js';
import { EVENTS, PATCH_HEADER, UPDATE } from './protocol.js';

const STREAM_URL = new URL('stream', import.meta.url);
const TAG = '[bn:hmr]';

let generation = null;
let applying = false;
let pending = null;

function log(...args) {
  console.info(TAG, ...args);
}

function warn(...args) {
  console.warn(TAG, ...args);
}

function emit(name, detail) {
  try {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  } catch {
    /* a document torn down mid-reload */
  }
}

/**
 * Give up on patching and reload. Always says *why* — a silent full reload is
 * indistinguishable from HMR being broken.
 */
function fullReload(reason) {
  warn(`falling back to a full reload — ${reason}`);
  emit(EVENTS.reload, { reason });
  location.reload();
}

/* ------------------------------------------------------------ stylesheets */

/**
 * Swap every `<link rel=stylesheet>` to a cache-busted URL. CSS needs no DOM
 * work at all: the browser re-paints from the new sheet and nothing in the tree
 * is touched, so focus and scroll are trivially intact.
 */
function reloadStylesheets() {
  const links = document.querySelectorAll('link[rel~="stylesheet"][href]');
  let swapped = 0;
  const stamp = String(Date.now());

  for (const link of links) {
    let url;
    try {
      url = new URL(link.getAttribute('href'), document.baseURI);
    } catch {
      continue;
    }
    if (url.origin !== location.origin) continue;
    url.searchParams.set('bn-hmr', stamp);
    link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    swapped++;
  }

  log(`reloaded ${swapped} stylesheet${swapped === 1 ? '' : 's'}`);
  emit(EVENTS.patched, { kind: UPDATE.style, stylesheets: swapped });
}

/* ------------------------------------------------------------------ patch */

async function applySoftUpdate(files) {
  const started = Date.now();
  let response;

  try {
    response = await fetch(location.href, {
      headers: { [PATCH_HEADER]: 'patch', accept: 'text/html' },
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'follow',
    });
  } catch (error) {
    fullReload(`re-fetching ${location.pathname} failed (${error?.message ?? error})`);
    return;
  }

  if (!response.ok) {
    fullReload(`re-fetching ${location.pathname} returned HTTP ${response.status}`);
    return;
  }

  if (response.redirected && new URL(response.url).pathname !== location.pathname) {
    fullReload(`the server redirected ${location.pathname} to ${new URL(response.url).pathname}`);
    return;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('html')) {
    fullReload(`the server answered with "${contentType || 'no content-type'}", not HTML`);
    return;
  }

  const nextDoc = parseDocument(await response.text());
  if (!nextDoc) {
    fullReload('the server response could not be parsed as an HTML document');
    return;
  }

  const state = capture(document);
  emit(EVENTS.beforePatch, { files });

  const result = patchDocument(document, nextDoc);
  if (!result.ok) {
    fullReload(result.reason);
    return;
  }

  const restored = restore(document, state);
  const { stats } = result;

  log(
    `patched in ${Date.now() - started}ms — ` +
      `${stats.matched} kept, ${stats.inserted} added, ${stats.removed} removed, ` +
      `${stats.attrsChanged} attrs, ${stats.textChanged} text` +
      (restored.focusUntouched
        ? ', focus never left'
        : restored.focusRestored
          ? ', focus restored'
          : '')
  );

  emit(EVENTS.patched, { kind: UPDATE.soft, files, stats, restored });
}

async function apply(message) {
  if (applying) {
    pending = message;
    return;
  }
  applying = true;
  try {
    if (message.kind === UPDATE.hard) {
      fullReload(message.reason ?? 'the server asked for a full reload');
      return;
    }
    if (message.kind === UPDATE.style) {
      reloadStylesheets();
      return;
    }
    await applySoftUpdate(message.files ?? []);
  } finally {
    applying = false;
    const next = pending;
    pending = null;
    if (next) apply(next);
  }
}

/* ----------------------------------------------------------------- stream */

function onMessage(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }

  if (message.type === 'hello') {
    if (generation !== null && message.generation !== generation) {
      log('dev server restarted — re-rendering');
      apply({ kind: UPDATE.soft, files: [], reason: 'server-restart' });
    } else {
      log(`connected to ${STREAM_URL.pathname}`);
    }
    generation = message.generation;
    return;
  }

  if (message.type === 'update') {
    const files = message.files ?? [];
    log(`change: ${files.length ? files.join(', ') : '(unknown)'} → ${message.kind}`);
    apply(message);
  }
}

function connect() {
  const source = new EventSource(STREAM_URL);
  source.addEventListener('message', (event) => onMessage(event.data));
  source.addEventListener('error', () => {
    // EventSource reconnects on its own; say so once per drop rather than
    // spamming, and let the `hello` generation check decide what happens when
    // the server comes back.
    if (source.readyState === EventSource.CLOSED) {
      warn('lost the dev server connection; retrying');
      setTimeout(connect, 1000);
    }
  });
}

connect();
