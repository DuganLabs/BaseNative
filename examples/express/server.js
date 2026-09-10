import express from 'express';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderRoute, renderComponentPage, renderNotFoundPage, siteRoutes } from './page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..', '..');

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
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
    res.send(renderRoute(route, { tasks, hasApi: true }));
  });
}

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

// -- Live reload (dev only) --
const liveClients = new Set();

app.get('/__live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: connected\n\n');
  liveClients.add(res);
  req.on('close', () => liveClients.delete(res));
});

let reloadTimer;
function notifyReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of liveClients) client.write('data: reload\n\n');
  }, 200);
}

const watchDirs = [
  join(__dirname, 'views'),
  join(__dirname, 'public'),
  join(__dirname),
  join(pkgRoot, 'packages', 'components', 'src'),
];
for (const dir of watchDirs) {
  try {
    watch(dir, { recursive: true }, () => notifyReload());
  } catch {
    /* dir may not exist in CI */
  }
}

// -- 404: registered last so every route above, including /__live, wins first --
app.use((req, res) => {
  res.status(404).send(renderNotFoundPage());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
