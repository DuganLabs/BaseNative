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
import { escapeText, raw } from '@basenative/runtime/shared/escape';
import { catalogBody } from '../../packages/platform/src/catalog.js';
import { renderBnHero } from '../../packages/platform/src/components.js';
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
    'public/scrollspy.js',
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
    hero: (site, ctx) => ({
      eyebrow: `Runtime ${ctx.runtimeVersion}`,
      titleHtml: 'Base<em>Native</em>',
      ledeHtml:
        '<p data-bn="bn-hero-lede">Signals over semantic HTML. One <code>set()</code> settles derived computeds, then runs each affected effect once. The expression language is an allowlist. Install <code>@basenative/runtime</code> and <code>@basenative/server</code> from npmjs.org, with no token and no <code>.npmrc</code>.</p>',
      actions: [
        { label: 'Try the playground', href: '/playground' },
        { label: 'Read the docs', href: '/docs' },
      ],
    }),
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
    hero: {
      eyebrow: 'Compare',
      titleHtml: 'How BaseNative <em>compares</em>',
      lede: "BaseNative is a small runtime for the web platform itself: valid HTML templates that stay data instead of becoming code, no build step, no dependencies, nothing to eval — so a page can be generated, stored in a CMS or database, and served under a strict CSP. An honest look alongside React, Angular, and Svelte: where it wins, where it doesn't, and why that matters.",
    },
  },
  {
    path: '/components',
    view: 'components.html',
    title: 'Components',
    description: `${flatComponents.length} semantic, server-rendered components built on native HTML primitives. No virtual DOM.`,
    ogTitle: 'BaseNative Components — Semantic by Construction',
    activePage: 'components',
    ctx: () => getComponentsPageContext(),
    hero: (site, ctx) => ({
      eyebrow: 'Component library',
      titleHtml: 'Semantic <em>by construction</em>',
      ledeHtml: `<p data-bn="bn-hero-lede">${ctx.totalCount} components across ${ctx.categoryCount} categories. Every one is built on a real HTML element — <code>&lt;button&gt;</code>, <code>&lt;dialog&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;table&gt;</code> — with <code>data-bn-*</code> attributes for variants and zero CSS classes.</p>`,
      actions: [
        { label: 'Read the API docs', href: '/docs' },
        { label: 'View live showcase', href: '/showcase' },
      ],
      label: 'Quick links',
    }),
  },
  {
    path: '/docs',
    view: 'docs.html',
    title: 'API Docs',
    description:
      'API reference for the @basenative/runtime primitives (signal, computed, effect, hydrate), the template directives and @basenative/server render(), with links to the generated docs/api reference for router, forms, components and every other package.',
    activePage: 'docs',
    ctx: () => getDocsPageContext(),
    hero: {
      eyebrow: 'Docs',
      titleHtml: 'API <em>Reference</em>',
      ledeHtml:
        '<p data-bn="bn-hero-lede">BaseNative currently exposes a small runtime/server surface and an intentionally constrained expression model. The goal in `v0.x` is correctness and trust, not arbitrary template execution.</p>' +
        '<p data-bn="bn-hero-lede"><code>@basenative/*</code> publishes to <strong>npmjs.org</strong>: the release pipeline publishes there directly, using OIDC trusted publishing — no registry tokens and no <code>.npmrc</code> redirect. A plain <code>npm install @basenative/runtime</code> gets the current release line (<code>2.3.0</code>). The <code>0.2.x</code>/<code>0.3.x</code> builds are the old pre-1.0 line, not stale mirrors of current releases.</p>',
    },
  },
  {
    path: '/ai',
    view: 'ai.html',
    title: 'AI',
    description:
      'Honest scorecard of the points against BaseNative for models: what is fixed, and what is an accepted tradeoff.',
    ogTitle: 'BaseNative for models — honest scorecard',
    activePage: 'ai',
    ctx: () => getAiPageContext(),
    hero: {
      eyebrow: 'AI',
      titleHtml: 'The scorecard for <em>models</em>',
      lede: 'Every point a previous page would have held against BaseNative, with an honest status. Fixed means the runtime or the docs changed. Accepted means the tradeoff stands.',
      actions: [
        { label: 'Cheat sheet', href: '/llms-start.txt' },
        { label: 'Compare', href: '/compare' },
        { label: 'API docs', href: '/docs' },
      ],
      label: 'Model entry points',
    },
  },
  {
    path: '/playground',
    view: 'playground.html',
    title: 'Playground',
    description:
      'Interactive sandbox for signals, computed values, effects, and template directives.',
    activePage: 'playground',
    ctx: () => ({}),
    hero: {
      eyebrow: 'Playground',
      titleHtml: 'Signals <em>Playground</em>',
      lede: 'Experiment with reactive signals, computed values, and live DOM updates — all running client-side with zero build tools.',
    },
  },
  {
    path: '/builder',
    view: 'builder.html',
    title: 'Builder',
    description:
      'Drag-and-drop visual builder powered by @basenative/builder — compose a layout and export BaseNative code.',
    activePage: 'builder',
    ctx: () => ({}),
    hero: {
      eyebrow: 'Builder',
      titleHtml: 'Visual <em>Builder</em>',
      lede: 'A macOS window: organism palette, canvas, layers, and inspector. Pick an organism, drop it on the canvas, edit it, and export BaseNative.',
    },
  },
  {
    path: '/showcase',
    view: 'showcase.html',
    title: 'Showcase',
    description: `Live gallery of all ${flatComponents.length} BaseNative components — every section is a real server render, not a mockup.`,
    ogTitle: 'BaseNative Showcase — Live Component Gallery',
    activePage: 'showcase',
    ctx: () => ({ ...getShowcaseContext(), categories: componentCategories }),
    hero: {
      attrs: 'data-bn-showcase-header',
      eyebrow: 'Live gallery',
      titleHtml: 'Component <em>showcase</em>',
      ledeHtml:
        '<p data-bn="bn-hero-lede">Every component, server-rendered and interactive. Each demo is a real <code>render*()</code> call from <code>@basenative/components</code> — no mockups, no screenshots, no virtual DOM.</p>',
      actions: [
        { label: 'Browse the catalog', href: '/components' },
        { label: 'Open the playground', href: '/playground' },
      ],
      label: 'Quick links',
    },
  },
  {
    path: '/roadmap',
    view: 'roadmap.html',
    title: 'Roadmap',
    description:
      'BaseNative release plan, trust blockers, browser policy, and workflow parity tracking.',
    activePage: 'roadmap',
    ctx: () => getRoadmapPageContext(),
    hero: {
      eyebrow: 'Roadmap',
      titleHtml: 'Enterprise <em>Readiness</em>',
      lede: 'BaseNative is a semantic SSR application foundation for evergreen browsers. Every milestone from trust blockers through workflow breadth is now implemented, with all packages, components, and advanced widgets shipped.',
    },
  },
  {
    path: '/tasks',
    view: 'tasks.html',
    title: 'Tasks',
    description: 'Live task list demonstrating signal-based hydration over server-rendered HTML.',
    activePage: 'tasks',
    ctx: ({ tasks, hasApi }) => getTasksPageContext(tasks, hasApi),
    hero: (site) => ({
      eyebrow: 'Tasks',
      titleHtml: 'Task <em>Manager</em>',
      lede: 'Server-rendered initial state with client-side hydration for interactivity.',
      after: site.hasApi
        ? ''
        : '<p data-tasks-static-notice>This is the static demo — tasks you add are kept in your browser and are not saved to a server.</p>',
    }),
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
    hero: {
      eyebrow: 'Design system',
      titleHtml: 'Platform <em>catalog</em>',
      lede: 'Every control the catalog renders, on Liquid Glass, in light and in dark.',
    },
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
    hero: {
      eyebrow: 'Signals',
      titleHtml: 'Signals <em>Verification</em>',
      lede: 'End-to-end verification: server-rendered data hydrated with reactive signals. No manual change detection.',
    },
  },
];

export function renderRoute(route, site = {}) {
  const ctx = route.ctx(site);
  // Every page hero is rendered by the catalog component from the
  // route's hero spec (data, or a function of the site state and the
  // route's own context) — no view hand-writes a <header> any more.
  const hero = typeof route.hero === 'function' ? route.hero(site, ctx) : route.hero;
  return renderPage(route.view, hero ? { ...ctx, hero: raw(renderBnHero(hero)) } : ctx, route);
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
  // The hero's meta list groups each term/description pair in a <div> —
  // the grouping element the HTML spec defines inside <dl> — built by
  // this one helper so the pattern lives in exactly one place.
  const metaPair = (term, value) => `<div><dt>${term}</dt><dd><code>${value}</code></dd></div>`;
  const ctx = {
    component,
    titleLead,
    titleAccent,
    hero: raw(
      renderBnHero({
        eyebrow: component.categoryTitle,
        titleHtml: `${escapeText(titleLead)}<em>${escapeText(titleAccent)}</em>`,
        lede: component.summary,
        attrs: 'data-bn-component-hero',
        after:
          `<dl data-bn-component-meta>` +
          metaPair('Element', `&lt;${escapeText(component.tag)}&gt;`) +
          metaPair('Module', '@basenative/components') +
          metaPair('Function', escapeText(component.fn)) +
          `</dl>`,
      }),
    ),
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
    {
      hero: raw(
        renderBnHero({
          eyebrow: '404',
          titleHtml: 'Page <em>not found</em>',
          lede: 'There is nothing at this address. The link may be out of date, or the URL may have a typo — every page on the site is reachable from the navigation.',
          attrs: 'data-bn-not-found',
          actions: [
            { label: 'Back to home', href: '/' },
            { label: 'Browse components', href: '/components' },
            { label: 'Read the API docs', href: '/docs' },
          ],
          label: 'Where to go next',
        }),
      ),
    },
    {
      title: 'Page not found',
      description: 'There is nothing at this address on basenative.com.',
      path: '/404.html',
    },
  );
}
