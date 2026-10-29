import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hmrMiddleware } from '@basenative/hmr';
import { renderRoute, renderComponentPage, renderNotFoundPage, siteRoutes } from './page.js';
import { trinitySiteCss } from './trinity.js';
import { playgroundComponentsCss } from './playground-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..', '..');

const app = express();

// -- Production security headers --
// The same set the Pages deploy writes as dist/_headers
// (scripts/build-pages.js) — the dev server sends them too, so the
// e2e suite runs under the policy production serves. That parity is
// what keeps a header from breaking a page only in production:
// X-Frame-Options DENY on every path once refused the playground's
// own preview frame on the live site while every local run passed.
// The preview document is the one exception — the playground frames
// it, so it is frameable by the site itself. Keep the two in sync.
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
app.use((req, res, next) => {
  const isPreview =
    req.path === '/playground/preview' || req.path.startsWith('/playground/preview/');
  res.set({
    'X-Frame-Options': isPreview ? 'SAMEORIGIN' : 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': isPreview ? `${CSP}; frame-ancestors 'self'` : CSP,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
});

// -- Hot module replacement (dev only; inert when NODE_ENV=production) --
// Registered first so /__bn_hmr/* wins before the static handlers. It injects
// an external module script — no inline <script>, so the strict CSP in
// docs/guides/security.md still holds.
app.use(
  hmrMiddleware({
    roots: [
      join(__dirname, 'views'),
      join(__dirname, 'public'),
      __dirname,
      join(pkgRoot, 'packages', 'components', 'src'),
    ],
    cwd: pkgRoot,
  }),
);

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.get('/bn-css/trinity.css', (req, res) => {
  res.type('css').send(trinitySiteCss());
});
app.use('/bn-css', express.static(join(pkgRoot, 'packages', 'components', 'src')));
app.use('/fonts', express.static(join(pkgRoot, 'packages', 'fonts')));
app.use('/icons', express.static(join(pkgRoot, 'packages', 'icons', 'src')));
app.use('/bn-builder-css', express.static(join(pkgRoot, 'packages', 'builder', 'src')));

// -- In-memory task store --
let nextId = 5;
let tasks = [
  { id: 1, title: 'Design token system', status: 'done' },
  { id: 2, title: 'Signal reactivity', status: 'done' },
  { id: 3, title: 'Server-side rendering', status: 'active' },
  { id: 4, title: 'Client hydration', status: 'pending' },
];

// -- Routes (table shared with scripts/build-pages.js) --

for (const route of siteRoutes) {
  app.get(route.path, (req, res) => {
    res.send(renderRoute(route, { tasks, hasApi: true, measure: req.query.measure === '1' }));
  });
}

// The playground's preview document: a real route (never a srcdoc
// document — WebKit resolves a srcdoc document's relative script URLs
// against about:srcdoc, which lost the runtime on iPhones). It loads
// the site's runtime bundle by absolute path and runs the editor panes
// the parent page posts to it.
app.get('/playground/preview', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'playground-preview.html'));
});

// The playground's assembled component sheet (see playground-data.js).
app.get('/playground/components.css', (req, res) => {
  res.type('css').send(playgroundComponentsCss);
});

app.get('/components/:slug', (req, res) => {
  const html = renderComponentPage(req.params.slug);
  if (!html) return res.status(404).send(renderNotFoundPage());
  res.send(html);
});

// -- API --

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = { id: nextId++, title: title.trim(), status: 'active' };
  tasks.push(task);
  res.status(201).json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  tasks.splice(idx, 1);
  res.status(204).end();
});

// -- 404: registered last so every route above wins first --
app.use((req, res) => {
  res.status(404).send(renderNotFoundPage());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
