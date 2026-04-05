/**
 * BaseNative — Node.js Standalone HTTP Server Example
 *
 * Demonstrates:
 * - SSR with streaming via @basenative/server
 * - Route matching via @basenative/router
 * - Static file serving
 * - No framework dependencies — pure Node.js http module
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { render, renderToStream } from '@basenative/server';
import { resolveRoute } from '@basenative/router';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// ── Routes ─────────────────────────────────────────────────────────────────

const routes = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/posts', name: 'posts' },
  { path: '/posts/:slug', name: 'post-detail' },
];

// ── In-memory data store ────────────────────────────────────────────────────

const posts = [
  {
    slug: 'introducing-basenative',
    title: 'Introducing BaseNative',
    excerpt: 'A signal-based web runtime over native HTML primitives.',
    content: 'BaseNative brings signal-based reactivity to native HTML with zero build step.',
    date: '2024-01-15',
  },
  {
    slug: 'zero-dependencies',
    title: 'Why Zero Production Dependencies?',
    excerpt: 'The runtime has zero external dependencies — and why that matters.',
    content: 'When a framework ships zero dependencies, it means faster installs, smaller bundles, and no supply chain risk.',
    date: '2024-02-01',
  },
];

// ── Templates ───────────────────────────────────────────────────────────────

const layout = (title, body, scripts = '') => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — BaseNative Demo</title>
  <style>
    @layer base {
      *, *::before, *::after { box-sizing: border-box; }
      body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1a1a1a; }
      a { color: #0066cc; }
      code { background: #f4f4f4; padding: .2em .4em; border-radius: 3px; font-size: .9em; }
    }
    @layer nav {
      nav { padding: 1rem 0; border-bottom: 1px solid #eee; margin-bottom: 2rem; }
      nav a { margin-right: 1.5rem; text-decoration: none; font-weight: 500; }
    }
    @layer footer { footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: .875rem; } }
  </style>
</head>
<body>
  <nav>
    <a href="/">BaseNative</a>
    <a href="/posts">Blog</a>
    <a href="/about">About</a>
  </nav>
  <main id="app">
    ${body}
  </main>
  <footer>
    <p>Built with <a href="https://github.com/DuganLabs/BaseNative">BaseNative</a> — a signal-based web runtime over native HTML.</p>
  </footer>
  ${scripts}
</body>
</html>`;

const homePage = () => render(`
<section>
  <h1>BaseNative</h1>
  <p>A signal-based web runtime over native HTML — zero build step, zero production dependencies.</p>
  <p><a href="/posts">Read the blog →</a></p>
</section>
<section>
  <h2>Core Principles</h2>
  <ul>
    <li>No namespace theater — semantic HTML only</li>
    <li>Zero inline styles — CSS cascade layers</li>
    <li>Trinity Standard — state, logic, template in one file</li>
    <li>Spec-first — every feature starts as a specification</li>
  </ul>
</section>
`, {});

const postsPage = (items) => render(`
<h1>Blog</h1>
<ul>
  <template @for="post of posts; track post.slug">
    <li>
      <a href="/posts/{{ post.slug }}">{{ post.title }}</a>
      <span> — {{ post.date }}</span>
      <p>{{ post.excerpt }}</p>
    </li>
  </template>
</ul>
`, { posts: items });

const postDetailPage = (post) => render(`
<template @if="post">
  <article>
    <h1>{{ post.title }}</h1>
    <time>{{ post.date }}</time>
    <p>{{ post.content }}</p>
    <p><a href="/posts">← Back to blog</a></p>
  </article>
</template>
<template @else>
  <h1>Post Not Found</h1>
  <p><a href="/posts">← Back to blog</a></p>
</template>
`, { post });

const aboutPage = () => render(`
<h1>About</h1>
<p>This example demonstrates BaseNative running as a standalone Node.js HTTP server with:</p>
<ul>
  <li>SSR via <code>@basenative/server</code></li>
  <li>Routing via <code>@basenative/router</code></li>
  <li>Streaming responses via <code>renderToStream()</code></li>
  <li>Zero framework overhead — pure <code>node:http</code></li>
</ul>
`, {});

// ── MIME type map for static files ─────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// ── Request handler ─────────────────────────────────────────────────────────

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Serve static files from /public
  const staticPath = join(PUBLIC_DIR, url.pathname);
  if (existsSync(staticPath) && !staticPath.endsWith('/')) {
    const ext = extname(staticPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(staticPath));
    return;
  }

  const match = resolveRoute(routes, url.pathname);
  let html;
  let status = 200;

  switch (match.name) {
    case 'home':
      html = layout('Home', homePage());
      break;
    case 'about':
      html = layout('About', aboutPage());
      break;
    case 'posts':
      html = layout('Blog', postsPage(posts));
      break;
    case 'post-detail': {
      const post = posts.find(p => p.slug === match.params.slug) || null;
      html = layout(post ? post.title : 'Not Found', postDetailPage(post));
      if (!post) status = 404;
      break;
    }
    default:
      html = layout('Not Found', '<h1>404 — Page Not Found</h1>');
      status = 404;
  }

  // Use streaming SSR for demo purposes
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  renderToStream(html, {}, res, { chunkSize: 8192 });
}

// ── Start server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`BaseNative demo server running at http://localhost:${PORT}`);
});
