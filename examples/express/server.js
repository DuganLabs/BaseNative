import express from 'express';
import { readFileSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from '@basenative/server';
import {
  renderBreadcrumb,
} from '../../packages/components/src/index.js';
import {
  getRoadmapPageContext,
  getHomePageContext,
  getTasksPageContext,
  navPages,
} from './site-data.js';
import { componentCategories, flatComponents, findComponent } from './component-catalog.js';
import { getDemo } from './component-demos.js';
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

const SITE_URL = 'https://basenative.com';
const DEFAULT_DESCRIPTION =
  'BaseNative — a signal-based runtime over native HTML. Zero build step. Zero deps in core. Semantic by construction.';

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderPage(viewFile, ctx, opts) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    ogTitle = `${title} — BaseNative`,
    path = '/',
    scripts = '',
    activePage = '',
  } = opts;

  const layout = read('views/layout.html');
  const view = read(`views/${viewFile}`);
  const content = render(view, ctx);
  let html = layout
    .replace(/<!--TITLE-->/g, escapeAttr(title))
    .replace(/<!--DESCRIPTION-->/g, escapeAttr(description))
    .replace(/<!--OG_TITLE-->/g, escapeAttr(ogTitle))
    .replace(/<!--OG_URL-->/g, escapeAttr(SITE_URL + path))
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
  res.send(
    renderPage('home.html', ctx, {
      title: 'Home',
      description: DEFAULT_DESCRIPTION,
      ogTitle: 'BaseNative — Semantic HTML + Signals',
      path: '/',
      activePage: 'home',
    }),
  );
});

app.get('/tasks', (req, res) => {
  const ctx = getTasksPageContext(tasks);
  res.send(
    renderPage('tasks.html', ctx, {
      title: 'Tasks',
      description: 'Live task list demonstrating signal-based hydration over server-rendered HTML.',
      path: '/tasks',
      activePage: 'tasks',
    }),
  );
});

app.get('/playground', (req, res) => {
  res.send(
    renderPage(
      'playground.html',
      {},
      {
        title: 'Playground',
        description:
          'Interactive sandbox for signals, computed values, effects, and template directives.',
        path: '/playground',
        activePage: 'playground',
      },
    ),
  );
});

app.get('/docs', (req, res) => {
  res.send(
    renderPage(
      'docs.html',
      {},
      {
        title: 'API Docs',
        description:
          'API reference for @basenative/runtime, @basenative/server, @basenative/router, @basenative/forms, and @basenative/components.',
        path: '/docs',
        activePage: 'docs',
      },
    ),
  );
});

app.get('/components', (req, res) => {
  const ctx = {
    categories: componentCategories,
    totalCount: flatComponents.length,
    categoryCount: componentCategories.length,
  };
  res.send(
    renderPage('components.html', ctx, {
      title: 'Components',
      description: `${flatComponents.length} semantic, server-rendered components built on native HTML primitives. No virtual DOM.`,
      ogTitle: 'BaseNative Components — Semantic by Construction',
      path: '/components',
      activePage: 'components',
    }),
  );
});

app.get('/components/:slug', (req, res) => {
  const component = findComponent(req.params.slug);
  if (!component) return res.status(404).send('Component not found');

  const demo = getDemo(component.slug);
  const idx = flatComponents.findIndex((c) => c.slug === component.slug);
  const prev = idx > 0 ? flatComponents[idx - 1] : null;
  const next = idx < flatComponents.length - 1 ? flatComponents[idx + 1] : null;
  const related = flatComponents
    .filter((c) => c.categoryId === component.categoryId && c.slug !== component.slug)
    .slice(0, 6);

  const ctx = {
    component,
    examples: demo?.examples ?? [],
    prev,
    next,
    related,
    breadcrumb: renderBreadcrumb({
      items: [
        { label: 'Home', href: '/' },
        { label: 'Components', href: '/components' },
        { label: component.title },
      ],
    }),
  };

  res.send(
    renderPage('component.html', ctx, {
      title: component.title,
      description: component.summary,
      ogTitle: `${component.title} — BaseNative`,
      path: `/components/${component.slug}`,
      activePage: 'components',
      scripts: getDemoScripts(component.slug),
    }),
  );
});

app.get('/roadmap', (req, res) => {
  const ctx = getRoadmapPageContext();
  res.send(
    renderPage('roadmap.html', ctx, {
      title: 'Roadmap',
      description:
        'BaseNative release plan, trust blockers, browser policy, and workflow parity tracking.',
      path: '/roadmap',
      activePage: 'roadmap',
    }),
  );
});

app.get('/test-signals', (req, res) => {
  const items = [
    { id: 1, name: 'Server-rendered item A', status: 'done' },
    { id: 2, name: 'Server-rendered item B', status: 'active' },
    { id: 3, name: 'Server-rendered item C', status: 'pending' },
  ];
  const ctx = { items, itemsJson: JSON.stringify(items) };
  res.send(
    renderPage('test-signals.html', ctx, {
      title: 'Signal Verification',
      path: '/test-signals',
    }),
  );
});

app.get('/showcase', (req, res) => {
  const baseCtx = getShowcaseContext();
  const ctx = {
    ...baseCtx,
    categories: componentCategories,
  };
  res.send(
    renderPage('showcase.html', ctx, {
      title: 'Showcase',
      description: `Live gallery of all ${flatComponents.length} BaseNative components — every section is a real server render, not a mockup.`,
      ogTitle: 'BaseNative Showcase — Live Component Gallery',
      path: '/showcase',
      activePage: 'showcase',
    }),
  );
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

// -- Per-component demo client scripts --

function getDemoScripts(slug) {
  const map = {
    button: `
      <script type="module">
        import { signal, effect } from '/basenative.js';
        const out = document.querySelector('[data-bn-demo-counter]');
        if (out) {
          const count = signal(0);
          effect(() => { out.textContent = count(); });
          document.querySelector('[data-bn-demo-inc]').onclick = () => count.set(count() + 1);
          document.querySelector('[data-bn-demo-dec]').onclick = () => count.set(count() - 1);
          document.querySelector('[data-bn-demo-reset]').onclick = () => count.set(0);
        }
      </script>
    `,
    input: `
      <script type="module">
        import { signal, effect } from '/basenative.js';
        const input = document.querySelector('[data-bn-demo-bio]');
        const out = document.querySelector('[data-bn-demo-bio-count]');
        if (input && out) {
          const text = signal('');
          effect(() => { out.textContent = text().length + ' / 120'; });
          input.addEventListener('input', e => text.set(e.target.value));
        }
      </script>
    `,
    progress: `
      <script type="module">
        import { signal, effect } from '/basenative.js';
        const bar = document.querySelector('[data-bn-demo-progress]');
        const reset = document.querySelector('[data-bn-demo-progress-reset]');
        if (bar) {
          const v = signal(0);
          effect(() => { bar.value = v(); });
          const tick = () => v.set((v() + 5) % 105);
          let id = setInterval(tick, 200);
          reset?.addEventListener('click', () => v.set(0));
        }
      </script>
    `,
    drawer: `
      <script type="module">
        const drawer = document.getElementById('demo-drawer-page');
        const opener = document.querySelector('[data-bn-demo-drawer-open]');
        const overlay = document.querySelector('[data-bn="drawer-overlay"]');
        const close = document.querySelector('[data-bn="drawer-close"]');
        opener?.addEventListener('click', () => { drawer?.setAttribute('data-open',''); overlay?.removeAttribute('hidden'); });
        const dismiss = () => { drawer?.removeAttribute('data-open'); overlay?.setAttribute('hidden',''); };
        overlay?.addEventListener('click', dismiss);
        close?.addEventListener('click', dismiss);
      </script>
    `,
    toast: `
      <script type="module">
        const container = document.querySelector('[data-bn="toast-container"]');
        const messages = { info: 'For your information.', success: 'All good — saved.', error: 'Something went sideways.' };
        document.querySelectorAll('[data-bn-demo-toast]').forEach(btn => {
          btn.addEventListener('click', () => {
            const variant = btn.getAttribute('data-bn-demo-toast');
            const toast = document.createElement('output');
            toast.setAttribute('data-bn', 'toast');
            toast.setAttribute('data-variant', variant);
            toast.setAttribute('role', 'status');
            toast.textContent = messages[variant];
            container?.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3500);
            setTimeout(() => toast.remove(), 4000);
          });
        });
      </script>
    `,
  };
  const base = `
    <script type="module">
      // Tabs interaction (used by some demos)
      document.querySelectorAll('[data-bn="tab"]').forEach(tab => {
        tab.addEventListener('click', () => {
          const tabs = tab.closest('[data-bn="tabs"]');
          tabs.querySelectorAll('[data-bn="tab"]').forEach(t => t.setAttribute('aria-selected', 'false'));
          tabs.querySelectorAll('[data-bn="tab-panel"]').forEach(p => p.hidden = true);
          tab.setAttribute('aria-selected', 'true');
          const panel = tabs.querySelector('#' + tab.getAttribute('aria-controls'));
          if (panel) panel.hidden = false;
        });
      });
      document.querySelectorAll('[data-bn="alert-dismiss"]').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('[data-bn="alert"]')?.remove());
      });
    </script>
  `;
  return base + (map[slug] ?? '');
}

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
