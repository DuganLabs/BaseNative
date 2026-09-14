/**
 * Cross-package integration tests for BaseNative.
 * Tests verify that packages work correctly together.
 * Uses relative imports to avoid workspace resolution issues.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../packages/server/src/render.js';
import { signal, computed, effect } from '../../packages/runtime/src/index.js';
import { resolveRoute, compilePattern, matchRoute } from '../../packages/router/src/index.js';
import { createField, createForm, required, minLength, email } from '../../packages/forms/src/index.js';
import { defineConfig, string, optional } from '../../packages/config/src/index.js';
import { createLogger } from '../../packages/logger/src/index.js';
import { createI18n } from '../../packages/i18n/src/index.js';
import { createFlagManager, createMemoryProvider } from '../../packages/flags/src/index.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkComparePage, capabilityProblems, roadmapProblems } from '../../scripts/check-compare-page.js';
import {
  demoSnippets,
  demoSnippetProblems,
  demoClientApiProblems,
  snippetSyntaxError,
} from '../../scripts/check-demo-snippets.js';
import { computeCompareStats } from '../../scripts/compare-stats.js';
import { renderRoute, siteRoutes } from '../../examples/express/page.js';
import { flatComponents } from '../../examples/express/component-catalog.js';
import { getDemo } from '../../examples/express/component-demos.js';
import { getDemoScripts, demoInitialisers } from '../../examples/express/component-demo-scripts.js';
import { getShowcaseSections } from '../../examples/express/showcase-data.js';
import { getRoadmapPageContext } from '../../examples/express/site-data.js';
import * as components from '../../packages/components/src/index.js';

const { renderDrawer, renderPagination } = components;

// ─── 1. SSR + Runtime: Context Pipeline ──────────────────────────────────────

describe('SSR → Context Pipeline', () => {
  it('server renders a template with context', () => {
    const html = render('<h1>{{ title }}</h1><p>{{ message }}</p>', {
      title: 'BaseNative',
      message: 'Hello from SSR',
    });
    assert.ok(html.includes('<h1>BaseNative</h1>'));
    assert.ok(html.includes('<p>Hello from SSR</p>'));
  });

  it('@for renders list items; runtime signal holds same data', () => {
    const items = [{ id: 1, name: 'Apple' }, { id: 2, name: 'Banana' }];
    const html = render(
      '<ul><template @for="item of items; track item.id"><li>{{ item.name }}</li></template></ul>',
      { items }
    );
    assert.ok(html.includes('<li>Apple</li>'));
    assert.ok(html.includes('<li>Banana</li>'));
    const sig = signal(items);
    assert.deepEqual(sig(), items);
  });

  it('@if/@else renders correct branch', () => {
    const tpl = '<template @if="show"><span>yes</span></template><template @else><span>no</span></template>';
    assert.ok(render(tpl, { show: true }).includes('<span>yes</span>'));
    assert.ok(render(tpl, { show: false }).includes('<span>no</span>'));
  });
});

// ─── 2. Router + Server ───────────────────────────────────────────────────────

describe('Router + Server Integration', () => {
  const routes = [
    { path: '/', name: 'home', template: '<h1>Home</h1>' },
    { path: '/about', name: 'about', template: '<h1>About</h1>' },
    { path: '/users/:id', name: 'user', template: '<h1>User {{ params.id }}</h1>' },
  ];

  it('resolveRoute + render: full route-to-page pipeline', () => {
    function renderPage(pathname) {
      const match = resolveRoute(routes, pathname);
      const route = routes.find(r => r.name === match.name);
      return render(route?.template || '<h1>404</h1>', { params: match.params });
    }
    assert.ok(renderPage('/').includes('<h1>Home</h1>'));
    assert.ok(renderPage('/about').includes('<h1>About</h1>'));
    assert.ok(renderPage('/users/42').includes('<h1>User 42</h1>'));
  });

  it('compilePattern + matchRoute: nested param extraction', () => {
    const pattern = compilePattern('/users/:userId/posts/:postId');
    assert.deepEqual(matchRoute(pattern, '/users/99/posts/123'), { userId: '99', postId: '123' });
  });
});

// ─── 3. Forms + Validators ───────────────────────────────────────────────────

describe('Forms + Validators Integration', () => {
  it('form validates with multiple validators; submit blocked when invalid', async () => {
    const form = createForm({
      name: createField('', { validators: [required(), minLength(2)] }),
      email: createField('', { validators: [required(), email()] }),
    });
    assert.equal(form.valid(), false);
    const result = await form.submit();
    assert.equal(result.ok, false);

    form.fields.name.setValue('Alice');
    form.fields.email.setValue('alice@example.com');
    assert.equal(form.valid(), true);
  });

  it('field dirty/touched tracking and reset', () => {
    const field = createField('original');
    assert.equal(field.dirty(), false);
    field.setValue('changed');
    assert.equal(field.dirty(), true);
    field.touch();
    assert.equal(field.touched(), true);
    field.reset();
    assert.equal(field.dirty(), false);
    assert.equal(field.value(), 'original');
  });
});

// ─── 4. Config + Logger ───────────────────────────────────────────────────────

describe('Config + Logger Integration', () => {
  it('config loads from env object; logger uses configured level', () => {
    const config = defineConfig({
      schema: {
        LOG_LEVEL: optional(string(), 'info'),
        APP_NAME: optional(string(), 'basenative'),
      },
      env: { LOG_LEVEL: 'debug', APP_NAME: 'test-app' },
    });
    assert.equal(config.LOG_LEVEL, 'debug');
    assert.equal(config.APP_NAME, 'test-app');

    const entries = [];
    const logger = createLogger({
      level: config.LOG_LEVEL,
      transport: { write: (entry) => entries.push(entry) },
    });
    logger.info('test message');
    assert.ok(entries.some(e => e.msg === 'test message'));
  });

  it('logger child context propagates to entries', () => {
    const entries = [];
    const logger = createLogger({
      level: 'info',
      transport: { write: (entry) => entries.push(entry) },
    });
    const child = logger.child({ requestId: 'req-1' });
    child.info('child log');
    assert.ok(entries.some(e => e.requestId === 'req-1'));
  });
});

// ─── 5. Signal Composition ───────────────────────────────────────────────────

describe('Runtime Signal Composition', () => {
  it('computed chains update through multiple layers', () => {
    const price = signal(10);
    const qty = signal(3);
    const subtotal = computed(() => price() * qty());
    const tax = computed(() => subtotal() * 0.1);
    const total = computed(() => subtotal() + tax());

    assert.equal(total(), 33);
    price.set(20);
    assert.equal(total(), 66);
  });

  it('effect tracks signal and stops after dispose', () => {
    const count = signal(0);
    const log = [];
    const dispose = effect(() => { log.push(count()); });
    count.set(1);
    count.set(2);
    dispose.dispose();
    count.set(3);
    assert.deepEqual(log, [0, 1, 2]);
  });
});

// ─── 6. Server + Flags ───────────────────────────────────────────────────────

describe('Server + Flags: Feature-Flagged SSR', () => {
  it('flag value gates SSR output via context', async () => {
    const provider = createMemoryProvider({
      'new-ui': { enabled: false, percentage: 0 },
      'beta': { enabled: true, percentage: 100 },
    });
    const flags = createFlagManager(provider);

    const newUI = await flags.isEnabled('new-ui', {});
    const beta = await flags.isEnabled('beta', {});

    const tpl = '<template @if="show"><div>New</div></template><template @else><div>Old</div></template>';
    assert.ok(render(tpl, { show: newUI }).includes('Old'));
    assert.ok(render(tpl, { show: beta }).includes('New'));
  });
});

// ─── 7. Server + I18n ────────────────────────────────────────────────────────

describe('Server + I18n: Internationalized Rendering', () => {
  it('i18n translates a message; server renders translated string', () => {
    const i18n = createI18n({ locale: 'en' });
    i18n.addMessages('en', { greeting: 'Hello, {name}!' });

    const greeting = i18n.t('greeting', { name: 'Alice' });
    const html = render('<p>{{ greeting }}</p>', { greeting });
    assert.ok(html.includes('<p>Hello, Alice!</p>'));
  });

  it('locale switch changes translation output in subsequent renders', () => {
    const i18n = createI18n({ locale: 'en' });
    i18n.addMessages('en', { farewell: 'Goodbye' });
    i18n.addMessages('es', { farewell: 'Adiós' });

    assert.equal(i18n.t('farewell'), 'Goodbye');
    i18n.setLocale('es');
    const html = render('<p>{{ msg }}</p>', { msg: i18n.t('farewell') });
    assert.ok(html.includes('Adiós'));
  });
});

// ─── 8. Server + Logger: Per-Request Context ─────────────────────────────────

describe('Server + Logger: Request Context', () => {
  it('child logger per request; render produces HTML', () => {
    const logs = [];
    const logger = createLogger({
      level: 'info',
      transport: { write: (entry) => logs.push(entry) },
    });

    function handleRequest(reqId, template, ctx) {
      const reqLogger = logger.child({ requestId: reqId });
      reqLogger.info('rendering page');
      const html = render(template, ctx);
      reqLogger.info('render complete');
      return html;
    }

    const html = handleRequest('req-1', '<h1>{{ title }}</h1>', { title: 'Test' });
    assert.ok(html.includes('<h1>Test</h1>'));
    assert.ok(logs.every(l => l.requestId === 'req-1'));
    assert.ok(logs.length >= 2);
  });
});

// ─── 9. Config + Logger: Validated App Config ────────────────────────────────

describe('Config + Logger: Validated Configuration', () => {
  it('config schema validates and logger logs at configured level', () => {
    const logs = [];
    const config = defineConfig({
      schema: {
        logLevel: string({ default: 'info' }),
        serviceName: optional(string()),
      },
      env: { logLevel: 'warn', serviceName: 'test-service' },
    });

    const logger = createLogger({
      level: config.logLevel,
      name: config.serviceName,
      transport: { write: (entry) => logs.push(entry) },
    });

    logger.info('should be filtered at warn level');
    logger.warn('should appear');
    logger.error('should appear too');

    assert.equal(logs.length, 2);
    assert.equal(logs[0].msg, 'should appear');
    assert.equal(logs[0].name, 'test-service');
  });
});

// ─── 10. Forms + Server: Server-Side Form Validation ─────────────────────────

describe('Forms + Server: Server-Side Validation Flow', () => {
  it('invalid form submission yields error context for SSR error page', async () => {
    const form = createForm(
      {
        email: createField('', { validators: [required(), email()] }),
        name: createField('', { validators: [required(), minLength(2)] }),
      },
    );

    // Submit with empty values
    const result = await form.submit();
    assert.equal(result.ok, false);

    // Build error context for SSR
    const errorCtx = {
      emailError: result.errors.email?.[0]?.message ?? '',
      nameError: result.errors.name?.[0]?.message ?? '',
    };

    const html = render(
      `<template @if="emailError"><p class="error">{{ emailError }}</p></template>
       <template @if="nameError"><p class="error">{{ nameError }}</p></template>`,
      errorCtx,
    );
    assert.ok(html.includes('class="error"'));
  });

  it('valid form submission produces clean SSR context', async () => {
    const form = createForm({
      username: createField('alice', { validators: [required(), minLength(3)] }),
    });

    const result = await form.submit();
    assert.equal(result.ok, true);

    const html = render('<p>Welcome, {{ username }}!</p>', result.data);
    assert.ok(html.includes('<p>Welcome, alice!</p>'));
  });
});

// ─── 11. Flags + I18n: Locale-Gated Feature ──────────────────────────────────

describe('Flags + I18n: Locale-Gated Feature', () => {
  it('feature flag enables a localized message variant', async () => {
    const provider = createMemoryProvider({
      'new-greeting': { enabled: true, rules: [{ roles: ['beta'], value: true }] },
    });
    const fm = createFlagManager(provider);
    const i18n = createI18n({
      messages: {
        en: {
          greeting_new: 'Welcome to the new experience!',
          greeting_old: 'Welcome back.',
        },
      },
    });

    const isBeta = await fm.isEnabled('new-greeting', { role: 'beta' });
    const msgKey = isBeta ? 'greeting_new' : 'greeting_old';
    const html = render('<p>{{ greeting }}</p>', { greeting: i18n.t(msgKey) });
    assert.ok(html.includes('Welcome to the new experience!'));
  });
});

// ─── 12. /compare: published claims match the source ─────────────────────────

describe('/compare tells the truth about this repository', () => {
  it('every number on the page is what the source measures today', () => {
    const problems = checkComparePage();
    assert.deepEqual(
      problems,
      [],
      `/compare disagrees with the source:\n  ${problems.join('\n  ')}`,
    );
  });

  it('the claims the page is built on still hold', () => {
    const stats = computeCompareStats();
    assert.equal(stats.runtimeProdDeps, 0, '@basenative/runtime must ship zero dependencies');
    assert.equal(stats.buildSteps, 0, '@basenative/runtime must need no build step');
    assert.equal(stats.corePrimitives, 6, 'the page counts six core primitives');
    assert.equal(stats.hydrationStrategies, 4, 'the page claims four hydration strategies');
    assert.ok(stats.coreLines > 0, 'the reactivity core must be measurable');
  });
});

// ─── 13. The rest of the site: published claims match the source ─────────────
// /compare had the only truth guard on the site; every defect below was a page
// stating something about the repository that nothing checked.

// Repo-relative, not cwd-relative: nx runs this file from tests/integration and
// CI from the repository root.
const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

describe('the capability guard reads prose, not just numbers', () => {
  it('flags a negative capability claim whose package ships', () => {
    const problems = capabilityProblems('<li>No HMR — refresh by hand</li>', ['hmr', 'router']);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /"No HMR" but packages\/hmr ships/);
  });

  it('stays quiet when the package does not exist, and when the page never denies it', () => {
    assert.deepEqual(capabilityProblems('<li>No HMR</li>', ['router']), []);
    assert.deepEqual(capabilityProblems('<td>HMR (@basenative/hmr)</td>', ['hmr']), []);
  });

  it('/compare no longer denies HMR while @basenative/hmr ships', () => {
    const route = siteRoutes.find((r) => r.path === '/compare');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    assert.doesNotMatch(html, /\bNo HMR\b/i);
    assert.match(html, /HMR \(@basenative\/hmr\)/);
  });
});

describe('/roadmap derives its readiness tiles', () => {
  // Recomputed here rather than imported from the helper the page uses: an
  // expectation produced by the code under test proves nothing.
  const expected = readdirSync(repo('packages')).filter((d) => {
    try {
      return !JSON.parse(readFileSync(repo(`packages/${d}/package.json`), 'utf8')).private;
    } catch {
      return false;
    }
  }).length;

  it('the Public Packages tile is the number of non-private workspace packages', () => {
    const tile = getRoadmapPageContext().readinessStats.find((s) => s.label === 'Public Packages');
    assert.equal(Number(tile.value), expected);
  });

  it('the milestone tile is the last release stage, not a retyped label', () => {
    const ctx = getRoadmapPageContext();
    const tile = ctx.readinessStats.find((s) => s.label === 'Current Milestone');
    assert.equal(tile.value, ctx.releaseStages.at(-1).milestone);
  });

  it('no readiness tile is a typed number in site-data.js', () => {
    const source = readFileSync(repo('examples/express/site-data.js'), 'utf8');
    const tiles = source.match(/readinessStats:\s*\[([\s\S]*?)\]/)[1];
    assert.doesNotMatch(tiles, /value:\s*'\d/);
  });

  it('the guard would catch a page that stopped rendering the count', () => {
    const problems = roadmapProblems({ publicPackages: expected + 1000 });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /roadmap renders without/);
    assert.deepEqual(roadmapProblems({ publicPackages: expected }), []);
  });
});

describe('component catalogue summaries describe shipped behaviour', () => {
  const summaryOf = (slug) => flatComponents.find((c) => c.slug === slug).summary;
  const css = readFileSync(repo('packages/components/src/components.css'), 'utf8');

  it('pagination claims only the controls renderPagination emits', () => {
    const html = renderPagination({ currentPage: 3, totalPages: 10 });
    for (const control of ['first', 'last']) {
      if (!new RegExp(`\\b${control}\\b`, 'i').test(summaryOf('pagination'))) continue;
      assert.match(html, new RegExp(`aria-label="${control} page"`, 'i'),
        `the pagination summary promises a ${control} control the component does not render`);
    }
    assert.match(summaryOf('pagination'), /\bprev\b/i);
    assert.match(summaryOf('pagination'), /\bnext\b/i);
  });

  it('drawer claims only the edges the stylesheet positions', () => {
    const summary = summaryOf('drawer');
    for (const edge of ['top', 'bottom', 'left', 'right', 'any edge']) {
      if (!new RegExp(`\\b${edge}\\b`, 'i').test(summary)) continue;
      assert.notEqual(edge, 'any edge', 'the drawer summary promises every edge');
      const positioned =
        edge === 'right' || css.includes(`[data-bn="drawer"][data-position="${edge}"]`);
      assert.ok(positioned, `the drawer summary promises "${edge}" but no rule positions it`);
    }
    assert.match(renderDrawer({ title: 'x', content: 'y', position: 'left' }), /data-position="left"/);
  });

  it('textarea and select summaries name declarations the stylesheet ships', () => {
    assert.match(summaryOf('textarea'), /field-sizing: content/);
    assert.match(css, /\[data-bn="textarea"\][^{]*\{[^}]*field-sizing:\s*content/s);
    assert.match(summaryOf('select'), /base-select/);
    assert.match(css, /\[data-bn="select"\][^{]*\{[^}]*appearance:\s*base-select/s);
  });
});

describe('component demos do what their controls say', () => {
  it('the expand-all accordion demo renders a non-exclusive group', () => {
    const html = getDemo('accordion').examples.find((e) => e.title === 'Expand / collapse all').html;
    const names = [...html.matchAll(/<details[^>]*\sname="/g)];
    assert.equal(names.length, 0, 'the expand-all demo must render a non-exclusive accordion');
    assert.ok(html.includes('<details'), 'the demo renders no accordion at all');
  });

  it('the dialog demo does not promise backdrop dismissal', () => {
    const example = getDemo('dialog').examples.find((e) => e.title === 'Modal dialog');
    assert.doesNotMatch(example.description, /backdrop/i);
    assert.doesNotMatch(example.code, /backdrop/i);
  });

  it('no demo on /showcase renders a navigation to a real site route', () => {
    const all = JSON.stringify(getShowcaseSections());
    assert.doesNotMatch(all, /href="\/showcase\?/,
      'a /showcase demo links to a real route — Cloudflare Pages ignores the query string and the click reloads the page');
  });
});

describe('/tasks tells the static visitor where their tasks go', () => {
  const tasksRoute = siteRoutes.find((r) => r.path === '/tasks');

  it('discloses that the static build does not persist, and only there', () => {
    const staticHtml = renderRoute(tasksRoute, { tasks: [], hasApi: false });
    assert.match(staticHtml, /not saved to a server/i,
      '/tasks must disclose that the static build does not persist');
    const apiHtml = renderRoute(tasksRoute, { tasks: [], hasApi: true });
    assert.doesNotMatch(apiHtml, /not saved to a server/i,
      'the disclosure must not appear when the API is live');
  });

  it('persists to localStorage in the same file as the signals', () => {
    const view = readFileSync(repo('examples/express/views/tasks.html'), 'utf8');
    assert.match(view, /localStorage\.getItem/);
    assert.match(view, /localStorage\.setItem/);
  });
});

describe('every published route is reachable from the navigation', () => {
  const layout = readFileSync(repo('examples/express/views/layout.html'), 'utf8');

  it('links every non-internal route from layout.html', () => {
    for (const route of siteRoutes) {
      if (route.internal) continue;
      assert.ok(
        layout.includes(`href="${route.path}"`),
        `${route.path} is published but nothing in layout.html links to it — either link it or mark it internal`,
      );
    }
  });

  it('a route with no nav entry is marked internal, and an internal route has no nav entry', () => {
    for (const route of siteRoutes) {
      assert.equal(!route.activePage, Boolean(route.internal),
        `${route.path}: activePage "${route.activePage}" and internal ${route.internal} disagree`);
    }
    assert.ok(siteRoutes.some((r) => r.internal), 'the verification harness is still expected to be internal');
  });
});

// ─── 14. /components/*: every Source pane is code a reader can run ───────────
// The pane's string is authored apart from the render beside it and from the
// client script; the Copy button hands it over verbatim. Fifteen of them
// shipped `items: [...]`, six taught a browser-side renderX() that the client
// bundle does not export, and four pages had nothing parseable at all.

describe('component Source panes are runnable JavaScript', () => {
  it('the syntax check rejects an elision and accepts real ESM', () => {
    assert.match(
      snippetSyntaxError("import { renderCombobox } from '@basenative/components';\nrenderCombobox({ items: [...] });"),
      /Unexpected token/,
    );
    assert.equal(snippetSyntaxError("import { renderCombobox } from '@basenative/components';\nrenderCombobox({ items: ['React'] });"), null);
  });

  it('every quickstart and example snippet parses, and every component page has one', () => {
    assert.ok(demoSnippets().length >= 78, `expected the catalogue's snippets, found ${demoSnippets().length}`);
    const problems = demoSnippetProblems();
    assert.deepEqual(problems, [], `Source panes that are not runnable:\n  ${problems.join('\n  ')}`);
  });

  it('no Source pane contains an elided array', () => {
    for (const { slug, label, code } of demoSnippets()) {
      assert.ok(!code.includes('[...]'), `${slug}/${label} still elides its data with [...]`);
    }
  });

  it('scripted panes use the client API the page itself uses, not a server render helper', () => {
    const problems = demoClientApiProblems();
    assert.deepEqual(problems, [], problems.join('\n'));
  });
});

// ─── 15. /docs: import samples name published packages, and the page leads on ─
// Five samples imported from 'basenative' — a package that does not exist —
// four lines below the paragraph explaining the real @basenative/* names, and
// the page had no links at all, though it is the 404's and the footer's Docs
// target.

describe('/docs names real packages and links onward', () => {
  const viewsDir = repo('examples/express/views');
  const views = readdirSync(viewsDir).filter((f) => f.endsWith('.html'));
  const docs = readFileSync(repo('examples/express/views/docs.html'), 'utf8');

  it("no view imports from 'basenative' — the published names are @basenative/*", () => {
    for (const f of views) {
      const src = readFileSync(`${viewsDir}/${f}`, 'utf8');
      const hit = /'basenative(?:\/|')/.exec(src);
      assert.equal(
        hit,
        null,
        `${f} imports from ${hit && hit[0]}… — the published names are @basenative/runtime and @basenative/server`,
      );
    }
  });

  it('every documented primitive links to its generated reference', () => {
    assert.ok(docs.includes('<a '), '/docs has no links at all');
    for (const [fn, doc] of [['signal', 'runtime'], ['computed', 'runtime'], ['effect', 'runtime'], ['hydrate', 'runtime'], ['render', 'server']]) {
      assert.match(docs, new RegExp(`href="[^"]*docs/api/${doc}\\.md[^"]*"[^>]*>Full <code>${fn}\\(\\)</code>`),
        `${fn}() on /docs does not link to docs/api/${doc}.md`);
    }
  });

  it('every package the /docs description names is linked to an existing docs/api reference', () => {
    const route = siteRoutes.find((r) => r.path === '/docs');
    const named = route.description.match(/@basenative\/[a-z-]+/g);
    assert.ok(named.length >= 2, 'the description should name the packages it covers');
    for (const pkg of new Set(named)) {
      const short = pkg.replace('@basenative/', '');
      assert.ok(docs.includes(`docs/api/${short}.md`), `${pkg} is promised by the /docs description but not linked from docs.html`);
    }
    for (const short of docs.match(/docs\/api\/([a-z-]+)\.md/g).map((m) => m.slice('docs/api/'.length, -'.md'.length))) {
      assert.ok(existsSync(repo(`docs/api/${short}.md`)), `docs.html links docs/api/${short}.md, which does not exist`);
    }
  });
});

// ─── 16. /components/* and /showcase run the package's initialisers ──────────
// The catalogue promised filtering, sorting, expand/collapse, chip editing,
// arrow keys and windowing while the site bundle shipped no `init*` at all
// (`grep -o 'init[A-Za-z]*' basenative.js` returned only "initial") and the
// demos hand-rolled a click-only copy of the tabs the package already had.

describe('the site bundle ships every client initialiser the package exports', () => {
  const shipped = Object.keys(components).filter((name) => /^init[A-Z]/.test(name));
  const entry = readFileSync(repo('examples/express/basenative-entry.js'), 'utf8');
  const bundle = readFileSync(repo('examples/express/public/basenative.js'), 'utf8');
  // esbuild's ESM output ends in one `export { … }` block; that list is what a
  // page can import from /basenative.js.
  const exported = bundle
    .match(/export\s*\{([^}]*)\}\s*;?\s*$/)[1]
    .split(',')
    .map((name) => name.trim().split(/\s+as\s+/).pop())
    .filter(Boolean);

  it('the package exports the ten initialisers the catalogue relies on', () => {
    assert.deepEqual(
      shipped.sort(),
      [
        'initCalendarDragDrop', 'initCommandPalette', 'initDataGrid', 'initDrawer', 'initDropdownMenu',
        'initMultiselect', 'initPipelineDragDrop', 'initTabs', 'initTree', 'initVirtualList',
      ],
    );
  });

  it('basenative-entry.js re-exports each one and the committed bundle carries it', () => {
    for (const name of shipped) {
      assert.ok(entry.includes(name), `${name} is missing from examples/express/basenative-entry.js`);
      assert.ok(
        exported.includes(name),
        `${name} is not exported by examples/express/public/basenative.js — run \`nx bundle basenative-example-express\` and commit the bundle`,
      );
    }
    for (const name of ['signal', 'computed', 'effect', 'hydrate']) {
      assert.ok(exported.includes(name), `the bundle lost the runtime's ${name}`);
    }
  });
});

describe('component demos call the package initialisers instead of copying them', () => {
  const initOf = (fn) => fn.replace(/^render/, 'init');
  const withInit = flatComponents.filter((c) => typeof components[initOf(c.fn)] === 'function');
  const importsOf = (script) => /import \{([^}]*)\} from '\/basenative\.js'/.exec(script)[1];

  it('the shared script hands every tablist to initTabs and no longer sets aria-selected by hand', () => {
    const script = getDemoScripts('button');
    assert.match(importsOf(script), /\binitTabs\b/);
    assert.match(script, /initTabs\(/);
    assert.doesNotMatch(script, /aria-selected/);
    assert.doesNotMatch(script, /tabindex/);
  });

  it('every component with an initialiser is listed, and its demo page imports and calls it', () => {
    assert.ok(withInit.length >= 8, `expected the eight initialised components, found ${withInit.length}`);
    for (const { slug, fn } of withInit) {
      const init = initOf(fn);
      if (slug !== 'tabs') {
        assert.equal(demoInitialisers[slug], init, `demoInitialisers has no ${init} for /components/${slug}`);
      }
      const script = getDemoScripts(slug);
      assert.match(importsOf(script), new RegExp(`\\b${init}\\b`), `/components/${slug} does not import ${init}`);
      assert.match(script, new RegExp(`${init}\\(`), `/components/${slug} never calls ${init}`);
    }
    for (const [slug, init] of Object.entries(demoInitialisers)) {
      assert.ok(flatComponents.some((c) => c.slug === slug), `demoInitialisers names an unknown slug ${slug}`);
      assert.equal(typeof components[init], 'function', `${init} is not exported by @basenative/components`);
    }
  });

  it('/components/drawer opens through initDrawer and never toggles hidden or data-open itself (BN-019)', () => {
    const script = getDemoScripts('drawer');
    assert.match(script, /const panel = initDrawer\(drawer\)/);
    assert.match(script, /panel\.open\(\)/);
    assert.doesNotMatch(script, /data-open|'hidden'|inert/);
  });

  it('/components/command-palette binds the Ctrl+K its demo advertises', () => {
    const script = getDemoScripts('command-palette');
    assert.match(script, /initCommandPalette\(cmd, \{ hotkey: 'Mod\+K' \}\)/);
    assert.doesNotMatch(script, /showModal/);
  });

  it('the virtual list demo rebuilds the full list from the total the markup carries', () => {
    const html = getDemo('virtual-list').examples[0].html;
    const total = Number(/data-total="(\d+)"/.exec(html)[1]);
    assert.equal(total, 1000);
    assert.match(getDemoScripts('virtual-list'), /dataset\.total/);
  });
});

describe('catalogue copy promises only what a shipped initialiser delivers', () => {
  const initOf = (fn) => fn.replace(/^render/, 'init');
  // The capability verbs the 2026-09-12 audit found advertised with nothing
  // behind them. A summary may use one only when the package ships the
  // component's initialiser and the summary names it, as docs/api/components.md does.
  const FORBIDDEN = [/arrow-key/i, /fuzzy filter/i, /expand\/collapse/i, /chip removal/i, /visible slice/i, /re-slices/i, /close-on-select/i];

  it('a summary using a capability verb names the shipped initialiser that provides it', () => {
    for (const { slug, fn, summary } of flatComponents) {
      const hit = FORBIDDEN.find((re) => re.test(summary));
      if (!hit) continue;
      const init = initOf(fn);
      assert.equal(typeof components[init], 'function',
        `/components/${slug} promises "${summary}" but the package ships no ${init}`);
      assert.ok(summary.includes(init), `/components/${slug} promises "${summary}" without naming ${init}`);
    }
  });

  it('nothing on the site calls the command filter fuzzy — it is a substring match', () => {
    for (const { slug, summary } of flatComponents) assert.doesNotMatch(summary, /fuzzy/i, slug);
    for (const { slug } of flatComponents) {
      for (const ex of getDemo(slug).examples || []) {
        assert.doesNotMatch(`${ex.title} ${ex.description}`, /fuzzy/i, `${slug}: ${ex.title}`);
      }
    }
    assert.match(summaryOf(flatComponents, 'command-palette'), /substring filter/);
  });

  it('the tooltip demo says the invoker opens on activation, not hover', () => {
    const [example] = getDemo('tooltip').examples;
    assert.doesNotMatch(`${example.title} ${example.html}`, /hover/i);
    assert.match(example.html, /Click or press Enter/);
    assert.match(example.html, /popovertarget=/, 'the trigger must be a popover invoker');
  });

  function summaryOf(list, slug) {
    return list.find((c) => c.slug === slug).summary;
  }
});

describe('/showcase runs the package initialisers rather than its own copies', () => {
  const showcase = readFileSync(repo('examples/express/public/showcase.js'), 'utf8');
  const imports = /import \{([^}]*)\} from '\/basenative\.js'/.exec(showcase)[1];

  it('imports and calls the tabs, drawer, dropdown, palette and virtual list initialisers', () => {
    for (const init of ['initTabs', 'initDrawer', 'initDropdownMenu', 'initCommandPalette', 'initVirtualList']) {
      assert.match(imports, new RegExp(`\\b${init}\\b`), `showcase.js does not import ${init}`);
      assert.match(showcase, new RegExp(`${init}\\(`), `showcase.js never calls ${init}`);
    }
  });

  it('no longer flips aria-selected, hides popovers or moves the virtual window by hand', () => {
    assert.doesNotMatch(showcase, /aria-selected/);
    assert.doesNotMatch(showcase, /"dropdown-item"|"command-item"|menu\.hidePopover/);
    assert.doesNotMatch(showcase, /translateY|virtual-item', |data-index/);
    assert.doesNotMatch(showcase, /drawer-close|drawer-overlay|inert/);
  });
});
