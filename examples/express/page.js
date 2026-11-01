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
import {
  renderTrinity,
  renderTrinityVm,
  trinityChromeCss,
  trinityComponentInfo,
} from './trinity.js';
import { renderSiteChrome, renderSiteFooter } from './shell.js';
import { highlightCodeBlocks } from './highlight.js';
import {
  getComparePageContext,
  getComponentsPageContext,
  getDocsPageContext,
  getHomePageContext,
  getTasksPageContext,
} from './site-data.js';
import { getAiPageContext } from './ai-scorecard.js';
import { trinityCatalog, trinityDemos } from './trinity-catalog.js';
import { getDesignSystemContext } from './design-system-data.js';
import { getPlaygroundPageContext } from './playground-data.js';

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

/* Every stylesheet the /bn-css chain is assembled from: the top-level
 * sheets and each component's own styles.css. Hashing only the top
 * level left a component restyle under the old version, so a visitor's
 * cached trinity.css kept the old component CSS for hours. */
export function componentStylesheets() {
  const root = join(__dirname, '../../packages/components/src');
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; /* an absent source tree mints no weaker version */
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) out.push(p);
    }
  };
  walk(root);
  return out;
}

/* Every component template the specimens fetch from /bn-css. */
export function componentTemplates() {
  const root = join(__dirname, '../../packages/components/src');
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory()) continue;
    const file = join(root, e.name, 'index.html');
    try {
      readFileSync(file);
      out.push(file);
    } catch {
      /* a directory without a template contributes nothing */
    }
  }
  return out;
}

function getAssetVersion() {
  if (assetVersion) return assetVersion;
  const hash = createHash('sha256');
  for (const file of [
    'public/basenative.js',
    'public/styles.css',
    'public/boot.js',
    'public/scrollspy.js',
    'public/more-menu.js',
    'public/playground.css',
    'public/playground.js',
    'public/playground-preview.js',
    'public/highlight-engine.js',
    'public/specimens.js',
  ]) {
    try {
      hash.update(read(file));
    } catch {
      /* an asset that is absent in some host mints no weaker version */
    }
  }
  for (const file of componentStylesheets()) hash.update(readFileSync(file, 'utf-8'));
  /* The specimens fetch each component's template (/bn-css/<name>/index.html)
   * under this version too, so a template-only change must mint a new one. */
  for (const file of componentTemplates()) hash.update(readFileSync(file, 'utf-8'));
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
/**
 * The social card for each published route (scripts/og-cards.mjs draws
 * them on the site's own sheets). Component pages share the catalog's
 * card; any other path takes the home card.
 */
export const OG_CARDS = [
  {
    slug: 'home',
    path: '/',
    eyebrow: '',
    title: 'Reactive UI in plain HTML.',
    lede: 'Signals over native HTML. No build step, no virtual DOM, zero dependencies in core.',
  },
  {
    slug: 'compare',
    path: '/compare',
    eyebrow: 'Compare',
    title: 'How BaseNative compares',
    lede: 'The same counter in BaseNative, React, Angular and Svelte — bytes, steps and tooling side by side.',
  },
  {
    slug: 'components',
    path: '/components',
    eyebrow: 'Components',
    title: 'Components on native HTML',
    lede: 'Semantic, server-rendered, token-driven. Every one accessible by construction.',
  },
  {
    slug: 'docs',
    path: '/docs',
    eyebrow: 'Docs',
    title: 'API reference',
    lede: 'signal, computed, effect, hydrate and render — the whole runtime on one page.',
  },
  {
    slug: 'ai',
    path: '/ai',
    eyebrow: 'AI',
    title: 'The scorecard for models',
    lede: 'One HTML file a model can write and a browser can run. No toolchain to hallucinate.',
  },
  {
    slug: 'playground',
    path: '/playground',
    eyebrow: 'Playground',
    title: 'Edit it live',
    lede: 'HTML, CSS and JS in the browser, running on the real runtime as you type.',
  },
  {
    slug: 'builder',
    path: '/builder',
    eyebrow: 'Builder',
    title: 'Drag, edit, export',
    lede: 'Compose components on a canvas and export clean BaseNative source.',
  },
];

export function ogImageFor(path) {
  const clean = path.replace(/\/+$/, '') || '/';
  const card =
    OG_CARDS.find((c) => c.path === clean) ||
    (clean.startsWith('/components/') ? OG_CARDS.find((c) => c.slug === 'components') : null) ||
    OG_CARDS[0];
  return `${SITE_URL}/og/${card.slug}.png`;
}

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
  return (
    layout
      .replace(/<!--TITLE-->/g, escapeAttr(title))
      .replace(/<!--DESCRIPTION-->/g, escapeAttr(description))
      .replace(/<!--OG_TITLE-->/g, escapeAttr(ogTitle))
      .replace(/<!--OG_URL-->/g, escapeAttr(SITE_URL + path))
      .replace(/<!--OG_IMAGE-->/g, escapeAttr(ogImageFor(path)))
      .replace('<!--APP_NAV_CSS-->', () => shellCriticalCss())
      .replace('<!--APP_SHELL-->', () => {
        const { sidebarHtml, appBarHtml } = renderSiteChrome(activePage);
        return renderTrinity('app-shell', {
          sidebarHtml,
          appBarHtml,
          mainId: 'main-content',
          contentHtml:
            '<output role="status" aria-live="polite" data-bn-visually-hidden></output>' + content,
        });
      })
      .replace('<!--FOOTER-->', () => renderSiteFooter())
      .replaceAll('__ACTIVE__', escapeAttr(activePage))
      .replace(
        '<!--EXTRA_CSS-->',
        path === '/builder' ? '<link rel="stylesheet" href="/bn-builder-css/builder.css" />' : '',
      )
      .replace('<!--SCRIPTS-->', scripts)
      .replace(/((?:href|src)=")(\/[^"]+\.(?:css|js))"/g, `$1$2?v=${version}"`)
      .replaceAll(`'/basenative.js'`, `'/basenative.js?v=${version}'`)
      .replaceAll(`"/basenative.js"`, `"/basenative.js?v=${version}"`)
      // Last, so the stamping above cannot rewrite the map's own key.
      .replace('<!--IMPORT_MAP-->', () => importMap(version))
  );
}

/**
 * The page's import map: every module that imports the bare
 * '/basenative.js' — specimens.js, hero-demo.js, playground code, any
 * external script — resolves it to this deploy's versioned bundle.
 *
 * Why: the version stamp above reaches URLs in the HTML, not the import
 * statements inside the site's external modules. Those kept importing
 * the unversioned bundle, which Cloudflare caches for hours, so after a
 * deploy a returning visitor ran the new specimens.js against the old
 * bundle: the combobox mount called a view-model method the stale
 * bundle lacked and the specimen never opened. An import map remaps the
 * specifier for every module on the page, so one deploy is one version.
 */
export function importMap(version) {
  const imports = { '/basenative.js': `/basenative.js?v=${version}` };
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}

/**
 * The playground's preview document (/playground/preview), stamped like
 * every other page: its preview script is versioned and its import map
 * points the preview's bare '/basenative.js' import at this deploy's
 * bundle, so a cached runtime never runs a newer preview script.
 */
export function renderPlaygroundPreview() {
  const version = getAssetVersion();
  return readFileSync(join(__dirname, 'public', 'playground-preview.html'), 'utf-8')
    .replace(/((?:href|src)=")(\/[^"]+\.(?:css|js))"/g, `$1$2?v=${version}"`)
    .replace('</head>', () => `  ${importMap(version)}\n  </head>`);
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
    title: 'Reactive UI in plain HTML',
    description: DEFAULT_DESCRIPTION,
    ogTitle: 'BaseNative — Reactive UI in plain HTML',
    activePage: 'home',
    ctx: () => getHomePageContext(),
    hero: (site, ctx) => ({
      eyebrow: `Runtime ${ctx.runtimeVersion}`,
      title: 'Reactive UI in plain HTML.',
      ledeHtml: `<p>Signals, server rendering and ${catalogEntries.length} accessible components built on real HTML elements. No build step, no virtual DOM, no dependencies in core — <code>npm install @basenative/runtime</code> and ship.</p>`,
      actions: [
        { label: 'Try the playground', href: '/playground' },
        { label: 'Read the docs', href: '/docs' },
      ],
      after: ctx.heroDemo,
    }),
    scripts: '<script type="module" src="/hero-demo.js"></script>',
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
      title: 'How BaseNative compares',
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
    ctx: ({ tasks, hasApi }) => ({
      ...getComponentsPageContext(),
      ...getTasksPageContext(tasks, hasApi),
    }),
    hero: (site, ctx) => ({
      eyebrow: 'Component library',
      title: 'Components',
      ledeHtml: `<p>${ctx.totalCount} components across ${ctx.categoryCount} categories. Every one is built on a real HTML element — <code>&lt;button&gt;</code>, <code>&lt;dialog&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;table&gt;</code> — addressed by element and <code>variant</code> attribute, with zero CSS classes. Each component is three files: a template, a token sheet, and its logic.</p>`,
      actions: [{ label: 'Read the API docs', href: '/docs' }],
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
    // The design system's token reference renders as this page's Design
    // tokens section — same parser (design-system-data.js), same tables.
    ctx: () => ({ ...getDocsPageContext(), ...getDesignSystemContext() }),
    hero: (site, ctx) => ({
      eyebrow: 'Docs',
      title: 'API reference',
      ledeHtml:
        '<p>BaseNative currently exposes a small runtime/server surface and an intentionally constrained expression model. The goal is correctness and trust, not arbitrary template execution.</p>' +
        `<p><code>@basenative/*</code> publishes to <strong>npmjs.org</strong>: the release pipeline publishes there directly, using OIDC trusted publishing — no registry tokens and no <code>.npmrc</code> redirect. A plain <code>npm install @basenative/runtime</code> gets the current release line (<code>${ctx.runtimeVersion}</code>). The <code>0.2.x</code>/<code>0.3.x</code> builds are the old pre-1.0 line, not stale mirrors of current releases.</p>`,
    }),
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
      title: 'The scorecard for models',
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
    ctx: () => getPlaygroundPageContext(),
    hero: {
      eyebrow: 'Playground',
      title: 'Playground',
      lede: 'A CodePen for BaseNative: edit the template, the CSS and the view model, and watch the real runtime hydrate it — no build step, nothing saved, reload resets.',
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
      title: 'Builder',
      lede: 'A macOS window: organism palette, canvas, layers, and inspector. Pick an organism, drop it on the canvas, edit it, and export BaseNative.',
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
      title: 'Signals verification',
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
  // A context carrying live specimens (the showcase) gets the specimen
  // boot and its JSON specs appended to the route's scripts.
  const effectiveRoute = ctx.liveSpecimens?.length
    ? { ...route, scripts: (route.scripts ?? '') + liveSpecimenScripts(ctx.liveSpecimens) }
    : route;
  return renderPage(
    route.view,
    hero ? { ...ctx, hero: raw(renderHero(hero)) } : ctx,
    effectiveRoute,
  );
}

/**
 * The specimen mount for a page: the specs a page's demos recorded
 * (see trinity-catalog.js) as one JSON script, then the mount itself.
 * public/specimens.js mounts every catalog specimen on the page —
 * it builds each component's view model from these props and
 * hydrates the component's own template; the behaviours live in
 * the components.
 */
export function liveSpecimenScripts(specs) {
  const json = JSON.stringify(specs).replaceAll('<', '\\u003c');
  return (
    `<script type="application/json" data-bn-live-specimens>${json}</script>` +
    '<script type="module" src="/specimens.js"></script>'
  );
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
  const { actions, label, heading, after, attrs: _attrs, force: _force, ...rest } = spec;
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
  const demos = (() => {
    const liveSpecimens = [];
    const list = (trinityDemos[slug] ?? (() => []))(renderTrinity, renderTrinityVm, (spec) =>
      liveSpecimens.push(spec),
    );
    return { list, liveSpecimens };
  })();
  const ctx = {
    component,
    titleLead,
    titleAccent,
    hero: raw(
      renderHero({
        eyebrow: component.categoryTitle,
        title: component.title,
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
    examples: demos.list.map((demo) => ({
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
    // The specimen mount runs on every component page: from the
    // recorded specs it hydrates each specimen with its component's
    // own view model and template, so the behaviours on the page are
    // the components' own.
    scripts: demos.liveSpecimens.length
      ? liveSpecimenScripts(demos.liveSpecimens)
      : '<script type="module" src="/specimens.js"></script>',
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
          title: 'Page not found',
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
