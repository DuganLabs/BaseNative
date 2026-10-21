/**
 * Site page renderer shared by the Express dev server (server.js) and the
 * static export (scripts/build-pages.js). Both hosts must emit the same HTML
 * for a route, so the layout substitution, the route table, the per-component
 * page context and the not-found page live here rather than in either caller.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';
import { raw } from '@basenative/runtime/shared/escape';
import { renderAppNav, renderBreadcrumb } from '../../packages/components/src/index.js';
import {
  getAppNavItems,
  getComparePageContext,
  getComponentsPageContext,
  getDocsPageContext,
  getHomePageContext,
  getRoadmapPageContext,
  getTasksPageContext,
} from './site-data.js';
import { componentCategories, flatComponents, findComponent } from './component-catalog.js';
import { getDemo } from './component-demos.js';
import { getDemoScripts } from './component-demo-scripts.js';
import { getShowcaseContext } from './showcase-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

/**
 * The shell-critical CSS, sliced out of the catalog's components.css at
 * render time: the App Nav section and the List Group section, verbatim
 * (comments stripped), inlined into every page by the layout.
 *
 * Why this exists: components.css reaches the browser through an
 * @import chain under /bn-css/, and Cloudflare Pages serves those
 * assets with a multi-hour cache lifetime while the HTML itself is
 * revalidated on every visit. A returning visitor can therefore hold a
 * components.css from before the app nav existed next to today's HTML
 * — and the shell renders as a raw list of links (seen on a real phone,
 * 2026-10-20, while every fresh-profile check passed). The shell is
 * not allowed to depend on that race: its rules ride the HTML, which
 * is always fresh. components.css stays the single source the slice is
 * cut from — when it is fresh too, the same rules arrive twice with
 * identical values and nothing changes.
 */
function shellCriticalCss() {
  const css = read('../../packages/components/src/components.css');
  const slice = (from, to) => {
    const start = css.indexOf(from);
    const end = to ? css.indexOf(to, start) : css.length;
    if (start === -1 || end === -1) return '';
    return css.slice(start, end);
  };
  const sections =
    slice('/* === List Group ===', '/* === Combobox ===') +
    slice('/* === App Nav ===', '} /* end @layer components */');
  return sections.replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

export const SITE_URL = 'https://basenative.com';
export const DEFAULT_DESCRIPTION =
  'BaseNative — a signal-based runtime over native HTML. Zero build step. Zero deps in core. Semantic by construction.';

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Render a view through views/layout.html.
 *
 * @param {string} viewFile  File name under views/
 * @param {object} ctx       Template context for the view
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {string} [opts.ogTitle]
 * @param {string} [opts.path]        Site-relative path for canonical/og:url
 * @param {string} [opts.scripts]     Extra markup injected before </body>
 * @param {string} [opts.activePage]  navPages entry to mark aria-current
 */
export function renderPage(viewFile, ctx, opts) {
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
  // The shell's primary navigation is the catalog's app nav — one <nav>
  // that is the phone-class bottom bar and the unfolded side rail under
  // a media query. Nine destinations overflow the bar, so the bar keeps
  // four and the rest ride the More sheet (renderAppNav's overflow).
  const appNav = renderAppNav({
    id: 'site-nav',
    brand: { name: 'BaseNative', href: '/' },
    items: getAppNavItems(activePage),
    actions:
      '<a href="https://github.com/DuganLabs/BaseNative" rel="noopener">GitHub</a>',
    overflow: {},
  });
  return layout
    .replace(/<!--TITLE-->/g, escapeAttr(title))
    .replace(/<!--DESCRIPTION-->/g, escapeAttr(description))
    .replace(/<!--OG_TITLE-->/g, escapeAttr(ogTitle))
    .replace(/<!--OG_URL-->/g, escapeAttr(SITE_URL + path))
    .replace('<!--APP_NAV_CSS-->', () => shellCriticalCss())
    .replace('<!--APP_NAV-->', appNav)
    .replace('<!--CONTENT-->', content)
    .replace('<!--SCRIPTS-->', scripts);
}

const TEST_SIGNAL_ITEMS = [
  { id: 1, name: 'Server-rendered item A', status: 'done' },
  { id: 2, name: 'Server-rendered item B', status: 'active' },
  { id: 3, name: 'Server-rendered item C', status: 'pending' },
];

/**
 * Top-level routes. `ctx(site)` receives host-specific state — today only the
 * task list, which is an in-memory store on the dev server and a fixed
 * snapshot in the static export. A route marked `internal` is served by the
 * dev server only and never published.
 */
export const siteRoutes = [
  {
    path: '/',
    view: 'home.html',
    title: 'Home',
    description: DEFAULT_DESCRIPTION,
    ogTitle: 'BaseNative — Semantic HTML + Signals',
    activePage: 'home',
    ctx: () => getHomePageContext(),
  },
  {
    path: '/tasks',
    view: 'tasks.html',
    title: 'Tasks',
    description: 'Live task list demonstrating signal-based hydration over server-rendered HTML.',
    activePage: 'tasks',
    ctx: ({ tasks, hasApi }) => getTasksPageContext(tasks, hasApi),
  },
  {
    path: '/playground',
    view: 'playground.html',
    title: 'Playground',
    description:
      'Interactive sandbox for signals, computed values, effects, and template directives.',
    activePage: 'playground',
    ctx: () => ({}),
  },
  {
    path: '/builder',
    view: 'builder.html',
    title: 'Builder',
    description:
      'Drag-and-drop visual builder powered by @basenative/builder — compose a layout and export BaseNative code.',
    activePage: 'builder',
    ctx: () => ({}),
  },
  {
    path: '/docs',
    view: 'docs.html',
    title: 'API Docs',
    description:
      'API reference for the @basenative/runtime primitives (signal, computed, effect, hydrate), the template directives and @basenative/server render(), with links to the generated docs/api reference for router, forms, components and every other package.',
    activePage: 'docs',
    ctx: () => getDocsPageContext(),
  },
  {
    path: '/components',
    view: 'components.html',
    title: 'Components',
    description: `${flatComponents.length} semantic, server-rendered components built on native HTML primitives. No virtual DOM.`,
    ogTitle: 'BaseNative Components — Semantic by Construction',
    activePage: 'components',
    ctx: () => getComponentsPageContext(),
  },
  {
    path: '/compare',
    view: 'compare.html',
    title: 'Compare',
    description:
      'How BaseNative compares to React, Angular and Svelte — bundle size, build requirements, API surface, hydration, and the tradeoffs that come with them.',
    ogTitle: 'BaseNative vs React, Angular, Svelte',
    activePage: 'compare',
    scripts: '<script type="module" src="/compare.js"></script>',
    ctx: () => getComparePageContext(),
  },
  {
    path: '/roadmap',
    view: 'roadmap.html',
    title: 'Roadmap',
    description:
      'BaseNative release plan, trust blockers, browser policy, and workflow parity tracking.',
    activePage: 'roadmap',
    ctx: () => getRoadmapPageContext(),
  },
  {
    // A verification harness for the dev server. `internal` keeps it out of
    // the static export, the sitemap and the reachability test — nothing in
    // the nav links to it, and the 404 page promises every published page is
    // reachable from there.
    path: '/test-signals',
    view: 'test-signals.html',
    title: 'Signal Verification',
    activePage: '',
    internal: true,
    ctx: () => ({ items: TEST_SIGNAL_ITEMS, itemsJson: JSON.stringify(TEST_SIGNAL_ITEMS) }),
  },
  {
    path: '/showcase',
    view: 'showcase.html',
    title: 'Showcase',
    description: `Live gallery of all ${flatComponents.length} BaseNative components — every section is a real server render, not a mockup.`,
    ogTitle: 'BaseNative Showcase — Live Component Gallery',
    activePage: 'showcase',
    ctx: () => ({ ...getShowcaseContext(), categories: componentCategories }),
  },
];

export function renderRoute(route, site = {}) {
  return renderPage(route.view, route.ctx(site), route);
}

/** Render /components/<slug>; returns null for a slug the catalog does not list. */
export function renderComponentPage(slug) {
  const component = findComponent(slug);
  if (!component) return null;

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
    // Every example's `html` is component markup assembled by the
    // @basenative/components render* functions over hand-authored data — no
    // user input reaches it — so this is a legitimate raw() trust assertion,
    // the same one getShowcaseContext() makes for the showcase demos.
    // Without it, {{ }} escapes the markup and the "Live render" pane on every
    // /components/:slug page shows the source as text instead of the component.
    examples: (demo?.examples ?? []).map((example) => ({ ...example, html: raw(example.html) })),
    prev,
    next,
    related,
    // Same raw() assertion as `examples` above — renderBreadcrumb() emits markup
    // from three hand-authored labels. Without it the breadcrumb printed as a
    // wall of escaped tags across the top of every /components/:slug page.
    breadcrumb: raw(
      renderBreadcrumb({
        items: [
          { label: 'Home', href: '/' },
          { label: 'Components', href: '/components' },
          { label: component.title },
        ],
      }),
    ),
  };

  return renderPage('component.html', ctx, {
    title: component.title,
    description: component.summary,
    ogTitle: `${component.title} — BaseNative`,
    path: `/components/${component.slug}`,
    activePage: 'components',
    scripts: getDemoScripts(component.slug),
  });
}

/** The 404 page: served by the dev server for unknown paths and written to dist/404.html for Cloudflare Pages. */
export function renderNotFoundPage() {
  return renderPage(
    'not-found.html',
    {},
    {
      title: 'Page not found',
      description: 'There is nothing at this address on basenative.com.',
      path: '/404.html',
    },
  );
}
