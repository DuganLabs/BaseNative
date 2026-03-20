/**
 * Pre-renders all Express routes to static HTML for Cloudflare Pages deployment.
 * Run after `nx bundle basenative-example-express` so basenative.js exists.
 */
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../packages/server/src/render.js';
import {
  getComponentsPageContext,
  getHomePageContext,
  getTasksPageContext,
  navPages,
  staticTasks,
} from '../examples/express/site-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const express = join(root, 'examples', 'express');
const dist = join(root, 'dist');
const read = (file) => readFileSync(join(express, file), 'utf-8');

// -- Layout helper (mirrors server.js) --
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
      activePage === page ? 'aria-current="page"' : ''
    );
  }
  return html;
}

function writePage(route, html) {
  const dir = route === '/' ? dist : join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`  ${route === '/' ? '/' : `/${route}/`}`);
}

// -- Page contexts (mirrors server.js) --
const pages = {
  '/': {
    view: 'home.html',
    title: 'Home',
    activePage: 'home',
    ctx: getHomePageContext(),
  },
  tasks: {
    view: 'tasks.html',
    title: 'Tasks',
    activePage: 'tasks',
    ctx: getTasksPageContext(staticTasks),
  },
  playground: {
    view: 'playground.html',
    title: 'Playground',
    activePage: 'playground',
    ctx: {},
  },
  docs: {
    view: 'docs.html',
    title: 'API Docs',
    activePage: 'docs',
    ctx: {},
  },
  components: {
    view: 'components.html',
    title: 'Components',
    activePage: 'components',
    ctx: getComponentsPageContext(),
  },
  'test-signals': {
    view: 'test-signals.html',
    title: 'Signal Verification',
    activePage: '',
    ctx: {
      items: [
        { id: 1, name: 'Server-rendered item A', status: 'done' },
        { id: 2, name: 'Server-rendered item B', status: 'active' },
        { id: 3, name: 'Server-rendered item C', status: 'pending' },
      ],
      get itemsJson() {
        return JSON.stringify(this.items);
      },
    },
  },
};

// -- Build --
console.log('Building static site...');
mkdirSync(dist, { recursive: true });

// Render pages
for (const [route, { view, title, activePage, ctx }] of Object.entries(pages)) {
  const html = renderPage(view, ctx, { title, activePage });
  writePage(route, html);
}

// Copy static assets
cpSync(join(express, 'public', 'styles.css'), join(dist, 'styles.css'));
cpSync(join(express, 'public', 'basenative.js'), join(dist, 'basenative.js'));

// Copy fonts (preserve structure so fonts.css relative paths work)
cpSync(join(root, 'packages', 'fonts'), join(dist, 'fonts'), { recursive: true });

// Copy icons
cpSync(join(root, 'packages', 'icons', 'src'), join(dist, 'icons'), { recursive: true });

// Write Cloudflare Pages _headers file for security headers
const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
`;
writeFileSync(join(dist, '_headers'), headers);
console.log('  _headers (security)');

console.log('Done → dist/');
