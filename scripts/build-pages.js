/**
 * Pre-renders all Express routes to static HTML for Cloudflare Pages deployment.
 * Run after `nx bundle basenative-example-express` so basenative.js exists.
 */
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../packages/server/src/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const express = join(root, 'examples', 'express');
const dist = join(root, 'dist');
const read = (file) => readFileSync(join(express, file), 'utf-8');

// -- Layout helper (mirrors server.js) --
const navPages = ['home', 'tasks', 'playground', 'docs', 'components'];

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
    ctx: {
      showStats: true,
      features: [
        { id: 1, name: '@if / @else conditional rendering', status: 'done' },
        { id: 2, name: '@for list rendering with track', status: 'done' },
        { id: 3, name: '@switch state matching', status: 'done' },
        { id: 4, name: 'Signal-based reactivity', status: 'done' },
        { id: 5, name: 'Server-side rendering', status: 'done' },
        { id: 6, name: 'Client hydration', status: 'done' },
        { id: 7, name: 'Expression binding (:attr, @event)', status: 'done' },
        { id: 8, name: 'SSR + hydration example', status: 'done' },
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
        { id: 4, text: 'Signals playground added', date: '2025-03-01' },
        { id: 5, text: 'API documentation page', date: '2025-03-15' },
      ],
    },
  },
  tasks: {
    view: 'tasks.html',
    title: 'Tasks',
    activePage: 'tasks',
    ctx: {
      tasks: [
        { id: 1, title: 'Design token system', status: 'done' },
        { id: 2, title: 'Signal reactivity', status: 'done' },
        { id: 3, title: 'Server-side rendering', status: 'active' },
        { id: 4, title: 'Client hydration', status: 'pending' },
      ],
      get tasksJson() {
        return JSON.stringify(this.tasks);
      },
    },
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
    ctx: {
      tableData: [
        { feature: '@if / @else', type: 'Directive', status: 'stable', since: '0.1.0' },
        { feature: '@for / @empty', type: 'Directive', status: 'stable', since: '0.1.0' },
        { feature: '@switch / @case', type: 'Directive', status: 'stable', since: '0.1.0' },
        { feature: 'signal()', type: 'Reactive', status: 'stable', since: '0.1.0' },
        { feature: 'computed()', type: 'Reactive', status: 'stable', since: '0.1.0' },
        { feature: 'effect()', type: 'Reactive', status: 'stable', since: '0.1.0' },
        { feature: 'Popover API', type: 'Platform', status: 'new', since: '0.2.0' },
        { feature: 'Anchor Positioning', type: 'Platform', status: 'new', since: '0.2.0' },
      ],
      selectOptions: [
        { value: 'signal', label: 'signal()' },
        { value: 'computed', label: 'computed()' },
        { value: 'effect', label: 'effect()' },
        { value: 'hydrate', label: 'hydrate()' },
      ],
    },
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

console.log('Done → dist/');
