import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { render } from '@basenative/server';
import { resolveRoute } from '@basenative/router';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readPage(name) {
  return readFileSync(join(__dirname, 'pages', name), 'utf8');
}

function readFile(path) {
  return readFileSync(join(ROOT, path));
}

const MIME = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

function layout(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — My App</title>
  <link rel="stylesheet" href="/public/app.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/counter">Counter</a>
      <a href="/todos">Todos</a>
    </nav>
  </header>
  <main>
    ${content}
  </main>
  <script type="module" src="/public/app.js"></script>
</body>
</html>`;
}

// ─── In-memory data stores ─────────────────────────────────────────────────────

let todos = [
  { id: 1, text: 'Learn BaseNative signals', done: true },
  { id: 2, text: 'Build a server-rendered page', done: true },
  { id: 3, text: 'Add client-side interactivity', done: false },
];
let nextTodoId = 4;

// ─── Page handlers ────────────────────────────────────────────────────────────

function handleHome(req, res) {
  const html = render(readPage('home.html'), {
    title: 'Welcome to BaseNative',
    features: [
      { name: 'Signals', description: 'Fine-grained reactivity without a virtual DOM' },
      { name: 'SSR', description: 'Server renders HTML with @if, @for, @switch directives' },
      { name: 'Hydration', description: 'Client attaches reactivity to server HTML — no re-render' },
      { name: 'Zero build', description: 'Native ESM — no bundler required in development' },
    ],
  });
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layout('Home', html));
}

function handleAbout(req, res) {
  const html = render(readPage('about.html'), {
    version: '0.3.0',
    packages: ['runtime', 'server', 'router', 'forms', 'auth', 'db'],
  });
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layout('About', html));
}

function handleCounter(req, res) {
  const html = render(readPage('counter.html'), { initialCount: 0 });
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layout('Counter', html));
}

function handleTodos(req, res) {
  const html = render(readPage('todos.html'), {
    todos,
    remaining: todos.filter(t => !t.done).length,
  });
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layout('Todos', html));
}

// ─── API handlers ─────────────────────────────────────────────────────────────

async function handleAddTodo(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  const { text } = JSON.parse(body);

  if (!text?.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'text is required' }));
    return;
  }

  const todo = { id: nextTodoId++, text: text.trim(), done: false };
  todos.push(todo);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(todo));
}

function handleToggleTodo(req, res, params) {
  const id = parseInt(params.id, 10);
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  todo.done = !todo.done;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(todo));
}

function handleDeleteTodo(req, res, params) {
  const id = parseInt(params.id, 10);
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  todos.splice(idx, 1);
  res.writeHead(204);
  res.end();
}

function handleStaticFile(req, res) {
  try {
    const filePath = req.url.replace('/public/', '');
    const data = readFile(`public/${filePath}`);
    const ext = extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

const routes = [
  { method: 'GET',    path: '/',                   handler: handleHome },
  { method: 'GET',    path: '/about',              handler: handleAbout },
  { method: 'GET',    path: '/counter',            handler: handleCounter },
  { method: 'GET',    path: '/todos',              handler: handleTodos },
  { method: 'POST',   path: '/api/todos',          handler: handleAddTodo },
  { method: 'PATCH',  path: '/api/todos/:id',      handler: handleToggleTodo },
  { method: 'DELETE', path: '/api/todos/:id',      handler: handleDeleteTodo },
];

// ─── Server ───────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  if (req.url.startsWith('/public/')) {
    handleStaticFile(req, res);
    return;
  }

  const url = req.url.split('?')[0];
  const match = resolveRoute(routes, req.method, url);

  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(layout('Not Found', '<h1>404 — Page not found</h1><p><a href="/">Go home</a></p>'));
    return;
  }

  Promise.resolve(match.handler(req, res, match.params)).catch(err => {
    console.error(err);
    res.writeHead(500);
    res.end('Internal server error');
  });
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`\nBaseNative starter running at http://localhost:${PORT}`);
  console.log('  GET  /           Home page');
  console.log('  GET  /counter    Signal counter demo');
  console.log('  GET  /todos      Todo list with live updates');
  console.log('\nPress Ctrl+C to stop.\n');
});
