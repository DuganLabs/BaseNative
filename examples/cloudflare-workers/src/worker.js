/**
 * BaseNative Cloudflare Workers Example
 *
 * Demonstrates:
 * - SSR with @basenative/server
 * - Client-side hydration script reference
 * - Routing with @basenative/router
 * - A simple form example
 * - ReadableStream response for streaming SSR
 */

import { render, renderToReadableStream } from '@basenative/server';
import { resolveRoute } from '@basenative/router';

// ── Route definitions ──────────────────────────────────────────────────────

const routes = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/todos', name: 'todos' },
  { path: '/todos/:id', name: 'todo-detail' },
];

// ── In-memory store (replace with KV, D1, etc. in production) ─────────────

const todos = [
  { id: '1', title: 'Learn BaseNative signals', done: true },
  { id: '2', title: 'Build with Cloudflare Workers', done: false },
  { id: '3', title: 'Ship to production', done: false },
];

// ── Page templates ──────────────────────────────────────────────────────────

const layout = (title, body) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — BaseNative</title>
  <style>
    @layer base { body { font-family: system-ui, sans-serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; } }
    @layer nav { nav a { margin-right: 1rem; } }
    @layer todos { .done { text-decoration: line-through; color: #888; } }
  </style>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/todos">Todos</a>
    <a href="/about">About</a>
  </nav>
  <main id="app">
    ${body}
  </main>
  <script type="module">
    import { hydrate, signal } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime/src/index.js';
    hydrate(document.getElementById('app'), window.__ctx__ || {});
  </script>
</body>
</html>`;

const homePage = () => render(`
  <h1>BaseNative on Cloudflare Workers</h1>
  <p>A signal-based web runtime over native HTML — zero build step, zero production dependencies.</p>
  <ul>
    <li><a href="/todos">View Todos</a></li>
    <li><a href="/about">About</a></li>
  </ul>
`, {});

const todosPage = (items) => render(`
  <h1>Todos</h1>
  <p>{{ total }} items, {{ done }} done</p>
  <ul>
    <template @for="todo of todos; track todo.id">
      <li>
        <a href="/todos/{{ todo.id }}" :class="todo.done ? 'done' : ''">{{ todo.title }}</a>
      </li>
    </template>
  </ul>
  <form method="POST" action="/todos">
    <input name="title" placeholder="New todo..." required>
    <button type="submit">Add</button>
  </form>
`, { todos: items, total: items.length, done: items.filter(t => t.done).length });

const todoDetailPage = (todo) => render(`
  <template @if="todo">
    <h1>{{ todo.title }}</h1>
    <p>Status: {{ todo.done ? 'Done' : 'Pending' }}</p>
    <a href="/todos">← Back</a>
  </template>
  <template @else>
    <h1>Not Found</h1>
    <p>That todo doesn't exist.</p>
    <a href="/todos">← Back to todos</a>
  </template>
`, { todo });

const aboutPage = () => render(`
  <h1>About</h1>
  <p>This example demonstrates BaseNative running on Cloudflare Workers:</p>
  <ul>
    <li>SSR via <code>@basenative/server</code></li>
    <li>Routing via <code>@basenative/router</code></li>
    <li>No framework, no bundler — native web primitives</li>
  </ul>
`, {});

const notFoundPage = (path) => render(`
  <h1>404 — Not Found</h1>
  <p>No page at <code>{{ path }}</code>.</p>
  <a href="/">← Go home</a>
`, { path });

// ── Worker entry point ──────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = resolveRoute(routes, url.pathname);

    // Handle form submission
    if (request.method === 'POST' && url.pathname === '/todos') {
      const body = await request.formData();
      const title = body.get('title')?.toString().trim();
      if (title) {
        const id = String(Date.now());
        todos.push({ id, title, done: false });
      }
      return Response.redirect(url.origin + '/todos', 303);
    }

    let html;
    let status = 200;

    switch (match.name) {
      case 'home':
        html = layout('Home', homePage());
        break;
      case 'about':
        html = layout('About', aboutPage());
        break;
      case 'todos':
        html = layout('Todos', todosPage(todos));
        break;
      case 'todo-detail': {
        const todo = todos.find(t => t.id === match.params.id) || null;
        html = layout(todo ? todo.title : 'Not Found', todoDetailPage(todo));
        if (!todo) status = 404;
        break;
      }
      default:
        html = layout('Not Found', notFoundPage(url.pathname));
        status = 404;
    }

    return new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
