/**
 * Site page renderer shared by the Express dev server (server.js) and the
 * static export (scripts/build-pages.js). Both hosts must emit the same HTML
 * for a route, so the layout substitution, the route table, the per-component
 * page context and the not-found page live here rather than in either caller.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';
import { raw } from '@basenative/runtime/shared/escape';
import { catalogBody } from '../../packages/platform/src/catalog.js';
import { renderBreadcrumb } from '../../packages/components/src/index.js';
import { renderSiteChrome, renderSiteFooter } from './shell.js';
import { highlightCodeBlocks } from './highlight.js';
import {
  getComparePageContext,
  getComponentsPageContext,
  getDocsPageContext,
  getHomePageContext,
  getRoadmapPageContext,
  getTasksPageContext,
} from './site-data.js';
import { getAiPageContext } from './ai-scorecard.js';
import { componentCategories, flatComponents, findComponent } from './component-catalog.js';
import { getDemo } from './component-demos.js';
import { getDemoScripts } from './component-demo-scripts.js';
import { getShowcaseContext } from './showcase-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

/**
 * A content version for the site's own code assets, stamped onto every
 * stylesheet/script URL the layout emits (`/basenative.js?v=…`,
 * `/styles.css?v=…`, the /bn-css chain, …).
 *
 * Why: Cloudflare serves those assets with a multi-hour cache lifetime
 * on unversioned URLs, while the HTML revalidates immediately — the
 * same asymmetry the shell-critical CSS above exists to defeat, one
 * layer down. It bit the app nav's keyboard sync (PR #278): the fix
 * shipped, the HTML was fresh, but a phone holding the pre-fix module
 * in a restored tab (module maps do not revalidate on restore) kept
 * running the old initAppNav and the bar stayed sliced under the
 * keyboard. A URL that changes when the bytes change cannot be served
 * stale: any deploy that touches the bundle, the site's sheets or the
 * package CSS mints a new version, and every page points at it. The
 * hash covers the bundle, the site's public sheets and every
 * packages/components/src stylesheet (the /bn-css chain's sources).
 */
let assetVersion = null;
function getAssetVersion() {
  if (assetVersion) return assetVersion;
  const hash = createHash('sha256');
  for (const file of [
    'public/basenative.js',
    'public/styles.css',
    'public/ios.css',
    'public/theme.css',
    'public/platform-shell.css',
    'public/platform-shell.js',
  ]) {
    try {
      hash.update(read(file));
    } catch {
      /* an asset that is absent in some host mints no weaker version */
    }
  }
  try {
    for (const dir of ['../../packages/components/src', '../../packages/platform/src']) {
      const cssDir = join(__dirname, dir);
      for (const name of readdirSync(cssDir)
        .filter((n) => n.endsWith('.css'))
        .sort()) {
        hash.update(readFileSync(join(cssDir, name), 'utf-8'));
      }
    }
  } catch {
    /* same reasoning as above */
  }
  assetVersion = hash.digest('hex').slice(0, 10);
  return assetVersion;
}

/**
 * Shell CSS inlined into every page. Pages caches stylesheets for hours
 * and revalidates HTML immediately, so the window chrome cannot depend
 * on /platform-shell.css arriving fresh (the 2026-10-20 phone incident).
 * The sheet defines its own --bn-shell-* properties and gives every
 * --bn-plat-* reference a fallback, so a stale tokens.css cannot collapse
 * the grid or the tab bar clearance.
 */
function shellCriticalCss() {
  return read('public/platform-shell.css').trim();
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
  // One highlighting pass for every code block on every page (see
  // highlight.js). Both hosts — dev server and static export — render
  // through here, so no page can ship monochrome code again.
  const content = highlightCodeBlocks(render(view, ctx));
  const version = getAssetVersion();
  return layout
    .replace(/<!--TITLE-->/g, escapeAttr(title))
    .replace(/<!--DESCRIPTION-->/g, escapeAttr(description))
    .replace(/<!--OG_TITLE-->/g, escapeAttr(ogTitle))
    .replace(/<!--OG_URL-->/g, escapeAttr(SITE_URL + path))
    .replace('<!--APP_NAV_CSS-->', () => shellCriticalCss())
    .replace('<!--APP_NAV-->', () => renderSiteChrome(activePage))
    .replace('<!--FOOTER-->', () => renderSiteFooter())
    .replaceAll('__ACTIVE__', escapeAttr(activePage))
    .replace('<!--CONTENT-->', content)
    .replace('<!--SCRIPTS-->', scripts)
    .replace(/((?:href|src)=")(\/[^"]+\.(?:css|js))"/g, `$1$2?v=${version}"`)
    .replaceAll(`'/basenative.js'`, `'/basenative.js?v=${version}'`)
    .replaceAll(`"/basenative.js"`, `"/basenative.js?v=${version}"`);
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
    path: '/components',
    view: 'components.html',
    title: 'Components',
    description: `${flatComponents.length} semantic, server-rendered components built on native HTML primitives. No virtual DOM.`,
    ogTitle: 'BaseNative Components — Semantic by Construction',
    activePage: 'components',
    ctx: () => getComponentsPageContext(),
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
    path: '/ai',
    view: 'ai.html',
    title: 'AI',
    description:
      'Honest scorecard of the points against BaseNative for models: what is fixed, what is mitigated, and what is an accepted tradeoff.',
    ogTitle: 'BaseNative for models — honest scorecard',
    activePage: 'ai',
    ctx: () => getAiPageContext(),
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
    path: '/showcase',
    view: 'showcase.html',
    title: 'Showcase',
    description: `Live gallery of all ${flatComponents.length} BaseNative components — every section is a real server render, not a mockup.`,
    ogTitle: 'BaseNative Showcase — Live Component Gallery',
    activePage: 'showcase',
    ctx: () => ({ ...getShowcaseContext(), categories: componentCategories }),
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
    path: '/tasks',
    view: 'tasks.html',
    title: 'Tasks',
    description: 'Live task list demonstrating signal-based hydration over server-rendered HTML.',
    activePage: 'tasks',
    ctx: ({ tasks, hasApi }) => getTasksPageContext(tasks, hasApi),
  },
  {
    path: '/design-system',
    view: 'design-system.html',
    title: 'Design system',
    description:
      'Every platform control in the states the catalog renders, on the material tokens, light and dark.',
    ogTitle: 'BaseNative design system',
    activePage: 'design-system',
    ctx: ({ measure } = {}) => ({ catalog: raw(catalogBody({ measure, omitTitle: true })) }),
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

  const titleWords = String(component.title || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const titleAccent = titleWords.length ? titleWords[titleWords.length - 1] : component.title;
  const titleLead = titleWords.length > 1 ? `${titleWords.slice(0, -1).join(' ')} ` : '';
  const ctx = {
    component,
    titleLead,
    titleAccent,
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
