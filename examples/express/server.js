import express from 'express';
import { readFileSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from '@basenative/server';
import {
  getComponentsPageContext,
  getHomePageContext,
  getTasksPageContext,
  navPages,
} from './site-data.js';
import { getShowcaseContext } from './showcase-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..', '..');
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

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

// -- Layout helper --
function renderPage(viewFile, ctx, { title, scripts = '', activePage = '' }) {
  const layout = read('views/layout.html');
  const view = read(`views/${viewFile}`);
  const content = render(view, ctx);
  let html = layout
    .replace('<!--TITLE-->', title)
    .replace('<!--CONTENT-->', content)
    .replace('<!--SCRIPTS-->', scripts);
  for (const page of navPages) {
    html = html.replace(
      `<!--${page.toUpperCase()}_ARIA-->`,
      activePage === page ? 'aria-current="page"' : '',
    );
  }
  return html;
}

// -- Routes --

app.get('/', (req, res) => {
  const ctx = getHomePageContext();
  const html = renderPage('home.html', ctx, { title: 'Home', activePage: 'home' });
  res.send(html);
});

app.get('/tasks', (req, res) => {
  const ctx = getTasksPageContext(tasks);
  const html = renderPage('tasks.html', ctx, { title: 'Tasks', activePage: 'tasks' });
  res.send(html);
});

app.get('/playground', (req, res) => {
  const html = renderPage('playground.html', {}, { title: 'Playground', activePage: 'playground' });
  res.send(html);
});

app.get('/docs', (req, res) => {
  const html = renderPage('docs.html', {}, { title: 'API Docs', activePage: 'docs' });
  res.send(html);
});

app.get('/components', (req, res) => {
  const ctx = getComponentsPageContext();
  const html = renderPage('components.html', ctx, {
    title: 'Components',
    activePage: 'components',
  });
  res.send(html);
});

app.get('/test-signals', (req, res) => {
  const items = [
    { id: 1, name: 'Server-rendered item A', status: 'done' },
    { id: 2, name: 'Server-rendered item B', status: 'active' },
    { id: 3, name: 'Server-rendered item C', status: 'pending' },
  ];
  const ctx = { items, itemsJson: JSON.stringify(items) };
  const html = renderPage('test-signals.html', ctx, { title: 'Signal Verification' });
  res.send(html);
});

app.get('/showcase', (req, res) => {
  const ctx = getShowcaseContext();
  const html = renderPage('showcase.html', ctx, { title: 'Showcase', activePage: 'showcase' });
  res.send(html);
});

app.get('/builder', (req, res) => {
  const html = renderPage('builder.html', {}, { title: 'Builder', activePage: 'builder' });
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
  join(pkgRoot, 'packages', 'components', 'src'),
];
for (const dir of watchDirs) {
  try {
    watch(dir, { recursive: true }, () => notifyReload());
  } catch {
    /* dir may not exist in CI */
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
