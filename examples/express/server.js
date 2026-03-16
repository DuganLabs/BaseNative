import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from '../../src/server/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

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
  return layout
    .replace('<!--TITLE-->', title)
    .replace('<!--CONTENT-->', content)
    .replace('<!--SCRIPTS-->', scripts)
    .replace('<!--HOME_ARIA-->', activePage === 'home' ? 'aria-current="page"' : '')
    .replace('<!--TASKS_ARIA-->', activePage === 'tasks' ? 'aria-current="page"' : '');
}

// -- Routes --

app.get('/', (req, res) => {
  const ctx = {
    showStats: true,
    features: [
      { id: 1, name: '@if / @else conditional rendering', status: 'done' },
      { id: 2, name: '@for list rendering with track', status: 'done' },
      { id: 3, name: '@switch state matching', status: 'done' },
      { id: 4, name: 'Signal-based reactivity', status: 'done' },
      { id: 5, name: 'Server-side rendering', status: 'active' },
      { id: 6, name: 'Client hydration', status: 'active' },
    ],
    stats: [
      { label: 'lines of runtime', value: '~120' },
      { label: 'dependencies', value: '0' },
      { label: 'build steps required', value: '0' },
      { label: 'virtual DOM nodes', value: '0' },
    ],
    updates: [
      { id: 1, text: 'Initial proof of concept complete', date: '2025-01-15' },
      { id: 2, text: 'Server renderer implemented', date: '2025-02-01' },
      { id: 3, text: 'Express example with SSR + hydration', date: '2025-02-15' },
    ],
  };
  const html = renderPage('home.html', ctx, { title: 'Home', activePage: 'home' });
  res.send(html);
});

app.get('/tasks', (req, res) => {
  const ctx = {
    tasks,
    tasksJson: JSON.stringify(tasks),
  };
  const scripts = '';
  const html = renderPage('tasks.html', ctx, { title: 'Tasks', scripts, activePage: 'tasks' });
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
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  tasks.splice(idx, 1);
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
