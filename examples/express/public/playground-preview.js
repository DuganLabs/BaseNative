/**
 * The playground's preview document (/playground/preview).
 *
 * A real route on the site, loading the site's own runtime bundle by
 * absolute path — never a srcdoc document: WebKit resolves a relative
 * script URL inside srcdoc against about:srcdoc, which is how the
 * prototype lost the runtime on iPhones. Here the frame's URL is real,
 * so /basenative.js resolves against the site origin in every engine.
 *
 * The parent page posts { html, css, js }; this document styles #app
 * with the CSS pane, sets its markup from the HTML pane, and runs the
 * JS pane as a classic script inside an IIFE (so a re-run's const/let
 * never collide with the previous run's globals). console output,
 * errors and hydrate diagnostics are reported back to the parent's
 * console in the JS pane.
 */
import { signal, computed, effect, batch, raw, registerDirective, hydrate } from '/basenative.js';

const send = (type, payload) => {
  parent.postMessage({ source: 'bn-playground', type, payload }, window.location.origin);
};

function fmt(v, depth) {
  depth = depth || 0;
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']';
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (depth > 2) return '[object]';
  try {
    const seen = [];
    return JSON.stringify(v, (k, val) => {
      if (typeof val === 'function') return '[function]';
      if (val && typeof val === 'object') {
        if (seen.indexOf(val) !== -1) return '[circular]';
        seen.push(val);
      }
      return val;
    });
  } catch {
    return String(v);
  }
}

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const orig = (console[level] || console.log).bind(console);
  console[level] = (...args) => {
    send('console', { level, args: args.map((a) => fmt(a)) });
    orig(...args);
  };
}

let runHadError = false;
/* A rejected promise nobody caught is an error the user wrote too. */
window.addEventListener('unhandledrejection', (e) => {
  runHadError = true;
  const r = e.reason;
  send('error', { message: 'Unhandled rejection: ' + (r && r.message ? r.message : fmt(r)) });
});
window.addEventListener('error', (e) => {
  if (e.message) {
    runHadError = true;
    send('error', { message: e.message });
  }
});

function diag(d) {
  if (d.level === 'error') runHadError = true;
  send('diagnostic', {
    level: d.level || 'warn',
    code: d.code || 'BN_DIAGNOSTIC',
    message: d.message || '',
    expression: d.expression || null,
  });
}

const wrappedHydrate = (root, ctx, opts) => {
  const o = { ...(opts || {}) };
  const userDiag = o.onDiagnostic;
  o.onDiagnostic = (d) => {
    diag(d);
    if (userDiag) userDiag(d);
  };
  return hydrate(root, ctx, o);
};

const app = document.getElementById('app');
const userStyle = document.createElement('style');
document.head.appendChild(userStyle);

const BASE_CSS = [
  ':root { color-scheme: light dark; }',
  ':root[data-theme="light"] { color-scheme: light; }',
  ':root[data-theme="dark"] { color-scheme: dark; }',
  '* { box-sizing: border-box; }',
  'body { margin: 0; padding: 18px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #ffffff; color: #17191c; }',
  '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) body { background: #131518; color: #eceff1; } }',
  ':root[data-theme="dark"] body { background: #131518; color: #eceff1; }',
  'button { font: inherit; cursor: pointer; }',
  'input { font: inherit; }',
].join('\n');

/* The base sheet applies on load, not only on the first run: before
   any run the frame is an empty document, and unstyled it renders as
   a plain white block inside the page whatever the theme. */
userStyle.textContent = BASE_CSS;

Object.assign(window, {
  signal,
  computed,
  effect,
  batch,
  raw,
  registerDirective,
  hydrate: wrappedHydrate,
  app,
  mount: (ctx, opts) => wrappedHydrate(app, ctx, opts),
});

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  const d = e.data;
  if (!d || d.source !== 'bn-playground-host') return;
  /* The host posts its theme (boot.js's data-theme, which the toggle
     can set against the OS scheme): the frame follows the page, and
     the base sheet's [data-theme] rules do the rest. */
  if (d.type === 'theme') {
    const theme = d.payload && d.payload.theme;
    if (theme === 'light' || theme === 'dark')
      document.documentElement.setAttribute('data-theme', theme);
    return;
  }
  if (d.type !== 'run') return;
  const { html, css, js } = d.payload || {};
  runHadError = false;
  userStyle.textContent = BASE_CSS + '\n' + (css || '');
  app.innerHTML = html || '';
  /* A fresh classic script per run; the IIFE keeps the run's top-level
     const/let out of the global lexical scope, so re-runs never throw
     "already declared". Synchronous throws surface through the window
     error listener above; mount() runs inside this call, so by the
     time appendChild returns, hydration and its diagnostics are done. */
  const script = document.createElement('script');
  script.textContent = ';(function () {\n' + (js || '') + '\n})();';
  document.body.appendChild(script);
  script.remove();
  send('done', { ok: !runHadError });
});

send('ready', {});
