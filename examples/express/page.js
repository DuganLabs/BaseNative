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
import { renderTrinity, renderTrinityVm, trinityChromeCss, trinityComponentInfo } from './trinity.js';
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
import { trinityCatalog, trinityCategoriesWith, trinityDemos } from './trinity-catalog.js';
import { getDesignSystemContext } from './design-system-data.js';
import { getShowcaseContext } from './showcase-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The catalog the whole site presents: the registry's facts (names,
 * roots, variants, the three files) joined with the copy and demos in
 * trinity-catalog.js. Built once — the registry loads synchronously.
 */
const catalogEntries = trinityCatalog(trinityComponentInfo());
const catalogBySlug = new Map(catalogEntries.map((entry) => [entry.slug, entry]));
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
    'public/token-bridge.css',
    'public/ios.css',
    'public/theme.css',
    'public/boot.js',
  ]) {
    try {
      hash.update(read(file));
    } catch {
      /* an asset that is absent in some host mints no weaker version */
    }
  }
  try {
    for (const dir of ['../../packages/components/src']) {
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
 * on a linked sheet arriving fresh (the 2026-10-20 phone incident).
 * The chrome is the catalog's now, so the critical block is the chrome
 * components' own sheets, assembled by trinity.js.
 */
function shellCriticalCss() {
  return trinityChromeCss();
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
    .replace('<!--APP_SHELL-->', () => {
      const { sidebarHtml, appBarHtml } = renderSiteChrome(activePage);
      return renderTrinity('app-shell', {
        sidebarHtml,
        appBarHtml,
        mainId: 'main-content',
        contentHtml:
          '<output role="status" aria-live="polite" data-bn-visually-hidden></output>' +
          content,
      });
    })
    .replace('<!--FOOTER-->', () => renderSiteFooter())
    .replaceAll('__ACTIVE__', escapeAttr(activePage))
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
        '<p>Signals over semantic HTML. One <code>set()</code> settles derived computeds, then runs each affected effect once. The expression language is an allowlist. Install <code>@basenative/runtime</code> and <code>@basenative/server</code> from npmjs.org, with no token and no <code>.npmrc</code>.</p>',
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
    description: `${catalogEntries.length} semantic, server-rendered components built on native HTML primitives. No virtual DOM.`,
    ogTitle: 'BaseNative Components — Semantic by Construction',
    activePage: 'components',
    ctx: () => getComponentsPageContext(),
    hero: (site, ctx) => ({
      eyebrow: 'Component library',
      titleHtml: 'Semantic <em>by construction</em>',
      ledeHtml: `<p>${ctx.totalCount} components across ${ctx.categoryCount} categories. Every one is built on a real HTML element — <code>&lt;button&gt;</code>, <code>&lt;dialog&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;table&gt;</code> — addressed by element and <code>variant</code> attribute, with zero CSS classes. Each component is three files: a template, a token sheet, and its logic.</p>`,
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
      id: 'api-reference',
      eyebrow: 'Docs',
      titleHtml: 'API <em>Reference</em>',
      ledeHtml:
        '<p>BaseNative currently exposes a small runtime/server surface and an intentionally constrained expression model. The goal in `v0.x` is correctness and trust, not arbitrary template execution.</p>' +
        '<p><code>@basenative/*</code> publishes to <strong>npmjs.org</strong>: the release pipeline publishes there directly, using OIDC trusted publishing — no registry tokens and no <code>.npmrc</code> redirect. A plain <code>npm install @basenative/runtime</code> gets the current release line (<code>2.3.0</code>). The <code>0.2.x</code>/<code>0.3.x</code> builds are the old pre-1.0 line, not stale mirrors of current releases.</p>',
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
    description: `Live gallery of all ${catalogEntries.length} BaseNative components — every section is a real server render, not a mockup.`,
    ogTitle: 'BaseNative Showcase — Live Component Gallery',
    activePage: 'showcase',
    ctx: () => ({ ...getShowcaseContext(), categories: trinityCategoriesWith(catalogEntries) }),
    hero: {
      eyebrow: 'Live gallery',
      titleHtml: 'Component <em>showcase</em>',
      ledeHtml:
        '<p>Every component, server-rendered live. Each demo is a real render from <code>@basenative/components</code> — the catalog itself, not a mockup or a screenshot.</p>',
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
      'The tokens every catalog component is built from — color roles, materials, type, space, and shape, in light and dark.',
    ogTitle: 'BaseNative design system',
    activePage: 'design-system',
    ctx: () => getDesignSystemContext(),
    hero: {
      eyebrow: 'Design system',
      titleHtml: 'Tokens, <em>all the way down</em>',
      lede: 'One token sheet holds the primitives and the roles. Every component sheet opens by mapping those roles onto its own tokens — no component hard-codes a color, a size, or a radius.',
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
  return renderPage(route.view, hero ? { ...ctx, hero: raw(renderHero(hero)) } : ctx, route);
}

/**
 * Render a route's hero spec through the catalog's hero. The specs keep
 * the shape they have always had (data, or a function of site state);
 * the translation lives here: platform action variants map onto the
 * catalog button's (prominent -> primary, bordered -> default), actions
 * render as catalog buttons (links, since they carry hrefs), and the
 * spec's `after` rides the hero's closing slot.
 */
function renderHero(spec) {
  const { actions, label, heading, after, attrs, force, ...rest } = spec;
  const actionsHtml = (actions ?? [])
    .map((action, index) =>
      renderTrinity('button', {
        label: action.label,
        href: action.href,
        variant:
          action.variant === 'prominent'
            ? 'primary'
            : action.variant === 'bordered'
              ? 'default'
              : (action.variant ?? (index === 0 ? 'primary' : 'default')),
      }),
    )
    .join('');
  return renderTrinity('hero', {
    ...rest,
    headingLevel: heading === 'h2' ? 'h2' : 'h1',
    actionsHtml,
    actionsLabel: label ?? 'Primary',
    afterHtml: after ?? '',
  });
}

/** Render /components/<slug>; returns null for a slug the catalog does not list. */
export function renderComponentPage(slug) {
  const component = catalogBySlug.get(slug);
  if (!component) return null;

  const idx = catalogEntries.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? catalogEntries[idx - 1] : null;
  const next = idx < catalogEntries.length - 1 ? catalogEntries[idx + 1] : null;
  const related = catalogEntries
    .filter((c) => c.categoryId === component.categoryId && c.slug !== slug)
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
  const demos = (trinityDemos[slug] ?? (() => []))(renderTrinity, renderTrinityVm);
  const ctx = {
    component,
    titleLead,
    titleAccent,
    hero: raw(
      renderHero({
        eyebrow: component.categoryTitle,
        titleHtml: `${escapeText(titleLead)}<em>${escapeText(titleAccent)}</em>`,
        lede: component.summary,
        after:
          `<dl>` +
          metaPair('Element', `&lt;${escapeText(component.tag)}&gt;`) +
          metaPair('Module', '@basenative/components') +
          metaPair('Variants', escapeText(component.variants.join(', '))) +
          `</dl>`,
      }),
    ),
    quickstart: component.usage,
    // Every demo's html is a real catalog render over hand-authored
    // props (trinity-catalog.js) — no user input reaches it — so this
    // raw() is the same trust assertion the other assembled contexts make.
    examples: demos.map((demo) => ({
      title: demo.title,
      description: demo.note ?? '',
      html: raw(demo.html),
    })),
    // The component is its three files; the pages show all three.
    files: [
      { name: 'index.html — the template', code: component.template },
      { name: 'styles.css — the token sheet', code: component.styles },
      { name: 'index.js — the logic', code: component.source },
    ],
    facts: [
      { term: 'Element', value: `<${component.tag}>` },
      { term: 'Variants', value: component.variants.join(', ') },
      { term: 'Files', value: 'index.html · styles.css · index.js' },
      { term: 'Registry name', value: component.slug },
    ],
    prev,
    next,
    related,
    breadcrumb: raw(
      renderTrinity('breadcrumb', {
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
    scripts: '',
  });
}

/** The 404 page: served by the dev server for unknown paths and written to dist/404.html for Cloudflare Pages. */
export function renderNotFoundPage() {
  return renderPage(
    'not-found.html',
    {
      hero: raw(
        renderHero({
          eyebrow: '404',
          titleHtml: 'Page <em>not found</em>',
          lede: 'There is nothing at this address. The link may be out of date, or the URL may have a typo — every page on the site is reachable from the navigation.',
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
