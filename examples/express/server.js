import express from 'express';
import { readFileSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from '@basenative/server';
import { renderBreadcrumb } from '../../packages/components/src/index.js';
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

app.get('/builder', (req, res) => {
  const html = renderPage('builder.html', {}, { title: 'Builder', activePage: 'builder' });
  res.send(html);
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
    quickstart: demo?.quickstart ?? '',
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
  const perSlug = {
    button: `
      const out = document.querySelector('[data-bn-demo-counter]');
      if (out) {
        const count = signal(0);
        effect(() => { out.textContent = count(); });
        document.querySelector('[data-bn-demo-inc]').onclick = () => count.set(count() + 1);
        document.querySelector('[data-bn-demo-dec]').onclick = () => count.set(count() - 1);
        document.querySelector('[data-bn-demo-reset]').onclick = () => count.set(0);
      }
    `,
    input: `
      const bio = document.querySelector('[data-bn-demo-bio]');
      const bioOut = document.querySelector('[data-bn-demo-bio-count]');
      if (bio && bioOut) {
        const text = signal('');
        effect(() => { bioOut.textContent = text().length + ' / 120'; });
        bio.addEventListener('input', (e) => text.set(e.target.value));
      }
    `,
    textarea: `
      const ta = document.querySelector('[data-bn-demo-thoughts]');
      const taOut = document.querySelector('[data-bn-demo-words]');
      if (ta && taOut) {
        const text = signal('');
        const words = computed(() => text().trim().split(/\\s+/).filter(Boolean).length);
        effect(() => { taOut.textContent = words() + ' words \\u00b7 ' + text().length + ' chars'; });
        ta.addEventListener('input', (e) => text.set(e.target.value));
      }
    `,
    select: `
      const sel = document.querySelector('select[data-bn-demo-region]');
      const selOut = document.querySelector('[data-bn-demo-region-out]');
      if (sel && selOut) {
        const region = signal('');
        effect(() => { selOut.textContent = region() || 'No region selected'; });
        sel.addEventListener('change', (e) => region.set(e.target.value));
      }
    `,
    checkbox: `
      const consent = document.querySelector('[data-bn-demo-consent] input[type=checkbox]');
      const submit = document.querySelector('[data-bn-demo-consent-submit]');
      if (consent && submit) {
        const agreed = signal(false);
        effect(() => { submit.disabled = !agreed(); });
        consent.addEventListener('change', (e) => agreed.set(e.target.checked));
      }
    `,
    radio: `
      const tierGroup = document.querySelector('[data-bn-demo-tier]');
      const tierOut = document.querySelector('[data-bn-demo-tier-out]');
      if (tierGroup && tierOut) {
        const TIERS = {
          Free: '5 projects, community support',
          Pro: 'Unlimited projects, priority email',
          Enterprise: 'SLA, SAML SSO, dedicated CSM',
        };
        const tier = signal('Free');
        effect(() => { tierOut.textContent = tier() + ' \\u2014 ' + TIERS[tier()]; });
        tierGroup.addEventListener('change', (e) => {
          if (e.target.matches('input[type=radio]')) tier.set(e.target.value);
        });
      }
    `,
    toggle: `
      const themeToggle = document.querySelector('[data-bn-demo-theme] input');
      const themeCard = document.querySelector('[data-bn-demo-theme-card]');
      if (themeToggle && themeCard) {
        const dim = signal(false);
        effect(() => { themeCard.dataset.dim = dim() ? 'on' : 'off'; });
        themeToggle.addEventListener('change', (e) => dim.set(e.target.checked));
      }
    `,
    alert: `
      const pushBtn = document.querySelector('[data-bn-demo-alert-push]');
      const alertStack = document.querySelector('[data-bn-demo-alert-stack]');
      if (pushBtn && alertStack) {
        const counter = signal(0);
        pushBtn.addEventListener('click', () => {
          counter.set(counter() + 1);
          const html = '<div data-bn="alert" data-variant="info" role="status">' +
            '<span data-bn="alert-content">Alert #' + counter() + ' just landed.</span>' +
            '<button data-bn="alert-dismiss" type="button" aria-label="Dismiss">\\u00d7</button>' +
            '</div>';
          alertStack.insertAdjacentHTML('afterbegin', html);
        });
      }
    `,
    progress: `
      const bar = document.querySelector('[data-bn-demo-progress]');
      const progOut = document.querySelector('[data-bn-demo-progress-out]');
      const progReset = document.querySelector('[data-bn-demo-progress-reset]');
      if (bar) {
        const v = signal(0);
        effect(() => { bar.value = v(); });
        effect(() => { if (progOut) progOut.textContent = v() + '%'; });
        setInterval(() => v.set((v() + 5) % 105), 200);
        progReset?.addEventListener('click', () => v.set(0));
      }
    `,
    skeleton: `
      const skelTarget = document.querySelector('[data-bn-demo-skel-target]');
      const skelReload = document.querySelector('[data-bn-demo-skel-reload]');
      if (skelTarget && skelReload) {
        const realHtml = skelTarget.innerHTML;
        const skelHtml =
          '<div data-bn="skeleton-stack">' +
          ['100%', '85%', '70%']
            .map((w) => '<div data-bn="skeleton" style="width:' + w + ';height:1rem"></div>')
            .join('') +
          '</div>';
        const loading = signal(false);
        effect(() => { skelTarget.innerHTML = loading() ? skelHtml : realHtml; });
        skelReload.addEventListener('click', () => {
          loading.set(true);
          setTimeout(() => loading.set(false), 1200);
        });
      }
    `,
    badge: `
      const badgeSlot = document.querySelector('[data-bn-demo-badge-slot]');
      const badgeInc = document.querySelector('[data-bn-demo-badge-inc]');
      const badgeDec = document.querySelector('[data-bn-demo-badge-dec]');
      if (badgeSlot && badgeInc && badgeDec) {
        const unread = signal(3);
        effect(() => {
          const variant = unread() > 5 ? 'error' : 'primary';
          badgeSlot.innerHTML = '<span data-bn="badge" data-variant="' + variant + '">' + unread() + '</span>';
        });
        badgeInc.addEventListener('click', () => unread.set(Math.max(0, unread() + 1)));
        badgeDec.addEventListener('click', () => unread.set(Math.max(0, unread() - 1)));
      }
    `,
    card: `
      const cardInput = document.querySelector('input[data-bn-demo-card-input]');
      const cardSlot = document.querySelector('[data-bn-demo-card-slot]');
      if (cardInput && cardSlot) {
        const title = signal(cardInput.value || 'Project Atlas');
        effect(() => {
          cardSlot.innerHTML =
            '<article data-bn="card">' +
            '<header data-bn="card-header">' + title() + '</header>' +
            '<div data-bn="card-body"><p>The card title comes from a signal.</p></div>' +
            '<footer data-bn="card-footer">Live preview</footer>' +
            '</article>';
        });
        cardInput.addEventListener('input', (e) => title.set(e.target.value || ' '));
      }
    `,
    accordion: `
      const accSlot = document.querySelector('[data-bn-demo-acc-slot]');
      const accExpand = document.querySelector('[data-bn-demo-acc-expand]');
      const accCollapse = document.querySelector('[data-bn-demo-acc-collapse]');
      if (accSlot) {
        const open = signal(null);
        effect(() => {
          if (open() === null) return;
          accSlot.querySelectorAll('details').forEach((d) => { d.open = open(); });
        });
        accExpand?.addEventListener('click', () => open.set(true));
        accCollapse?.addEventListener('click', () => open.set(false));
      }
    `,
    avatar: `
      const avInput = document.querySelector('input[data-bn-demo-av-input]');
      const avSlot = document.querySelector('[data-bn-demo-av-slot]');
      if (avInput && avSlot) {
        const initials = (n) =>
          (n || '?').split(/\\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
        const name = signal(avInput.value || 'Ada Lovelace');
        effect(() => {
          avSlot.innerHTML =
            '<span data-bn="avatar" data-size="xl" data-shape="circle" role="img" aria-label="' +
            (name() || 'Avatar') + '"><span data-bn="avatar-initials">' + initials(name()) + '</span></span>';
        });
        avInput.addEventListener('input', (e) => name.set(e.target.value));
      }
    `,
    pagination: `
      const pagerSlot = document.querySelector('[data-bn-demo-pager-slot]');
      const pagerOut = document.querySelector('[data-bn-demo-pager-out]');
      const TOTAL_PAGES = 8;
      if (pagerSlot && pagerOut) {
        const renderPager = (current) => {
          const arr = [];
          for (let i = 1; i <= TOTAL_PAGES; i++) {
            arr.push(
              '<li>' +
                (i === current
                  ? '<span aria-current="page">' + i + '</span>'
                  : '<a href="#p" data-page="' + i + '">' + i + '</a>') +
                '</li>',
            );
          }
          const prev = current > 1
            ? '<a href="#p" data-page="' + (current - 1) + '" rel="prev">Previous</a>'
            : '<span data-bn="pagination-disabled">Previous</span>';
          const next = current < TOTAL_PAGES
            ? '<a href="#p" data-page="' + (current + 1) + '" rel="next">Next</a>'
            : '<span data-bn="pagination-disabled">Next</span>';
          return '<nav data-bn="pagination" aria-label="Pagination"><ol>' +
            '<li>' + prev + '</li>' + arr.join('') + '<li>' + next + '</li>' +
            '</ol></nav>';
        };
        const page = signal(1);
        effect(() => {
          pagerSlot.innerHTML = renderPager(page());
          pagerOut.textContent = 'Page ' + page() + ' of ' + TOTAL_PAGES;
        });
        pagerSlot.addEventListener('click', (e) => {
          const link = e.target.closest('a[data-page]');
          if (link) {
            e.preventDefault();
            page.set(+link.dataset.page);
          }
        });
      }
    `,
    'command-palette': `
      const cmdOpen = document.querySelector('[data-bn-demo-cmd-open]');
      const cmd = document.getElementById('demo-cmd-page');
      cmdOpen?.addEventListener('click', () => cmd?.showModal());
    `,
    table: `
      const tq = document.querySelector('input[data-bn-demo-table-q]');
      const tslot = document.querySelector('[data-bn-demo-table-slot]');
      if (tq && tslot) {
        const query = signal('');
        effect(() => {
          for (const row of tslot.querySelectorAll('tbody tr')) {
            row.hidden = query() && !row.textContent.toLowerCase().includes(query());
          }
        });
        tq.addEventListener('input', (e) => query.set(e.target.value.toLowerCase()));
      }
    `,
    dialog: `
      const dlg = document.getElementById('demo-dialog-page');
      document.querySelector('[data-bn-demo-dialog-open]')?.addEventListener('click', () => dlg?.showModal());
      document.querySelector('[data-bn-demo-dialog-cancel]')?.addEventListener('click', () => dlg?.close());
      document.querySelector('[data-bn-demo-dialog-confirm]')?.addEventListener('click', () => dlg?.close());
    `,
    drawer: `
      const drawer = document.getElementById('demo-drawer-page');
      const opener = document.querySelector('[data-bn-demo-drawer-open]');
      const overlay = document.querySelector('[data-bn="drawer-overlay"]');
      const close = document.querySelector('[data-bn="drawer-close"]');
      opener?.addEventListener('click', () => {
        drawer?.setAttribute('data-open', '');
        overlay?.removeAttribute('hidden');
      });
      const dismiss = () => {
        drawer?.removeAttribute('data-open');
        overlay?.setAttribute('hidden', '');
      };
      overlay?.addEventListener('click', dismiss);
      close?.addEventListener('click', dismiss);
    `,
    toast: `
      const tcontainer = document.querySelector('[data-bn="toast-container"]');
      const messages = {
        info: 'For your information.',
        success: 'All good \\u2014 saved.',
        error: 'Something went sideways.',
      };
      document.querySelectorAll('[data-bn-demo-toast]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const variant = btn.getAttribute('data-bn-demo-toast');
          const toast = document.createElement('output');
          toast.setAttribute('data-bn', 'toast');
          toast.setAttribute('data-variant', variant);
          toast.setAttribute('role', 'status');
          toast.textContent = messages[variant];
          tcontainer?.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
          }, 3500);
          setTimeout(() => toast.remove(), 4000);
        });
      });
    `,
  };

  const slugScript = perSlug[slug] || '';

  // Shared interactions for components rendered on every demo page.
  const sharedScript = `
    document.querySelectorAll('[data-bn="tab"]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabs = tab.closest('[data-bn="tabs"]');
        tabs.querySelectorAll('[data-bn="tab"]').forEach((t) => t.setAttribute('aria-selected', 'false'));
        tabs.querySelectorAll('[data-bn="tab-panel"]').forEach((p) => (p.hidden = true));
        tab.setAttribute('aria-selected', 'true');
        const panel = tabs.querySelector('#' + tab.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
      });
    });
    document.querySelectorAll('[data-bn="alert-dismiss"]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('[data-bn="alert"]')?.remove());
    });
    document.body.addEventListener('click', (e) => {
      const dismiss = e.target.closest('[data-bn="alert-dismiss"]');
      if (dismiss) dismiss.closest('[data-bn="alert"]')?.remove();
    });
  `;

  return `
    <script type="module">
      import { signal, effect, computed } from '/basenative.js';
      ${sharedScript}
      ${slugScript}
    </script>
  `;
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
