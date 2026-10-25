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
import { computeCompareStats } from '../../scripts/compare-stats.js';
import { renderRoute, renderComponentPage, siteRoutes } from '../../examples/express/page.js';
import { highlightCode, highlightCodeBlocks } from '../../examples/express/highlight.js';
import { AI_SCORECARD } from '../../examples/express/ai-scorecard.js';
import { trinityDemos } from '../../examples/express/trinity-catalog.js';
import { renderTrinity, renderTrinityVm, trinityComponentInfo } from '../../examples/express/trinity.js';
import { getRoadmapPageContext, getAppNavItems } from '../../examples/express/site-data.js';
import * as components from '../../packages/components/src/index.js';


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


describe('the trinity specimens stay inside the page', () => {
  const slugs = trinityComponentInfo().map((entry) => entry.name);

  it('every registered component has at least one specimen, and it renders', () => {
    for (const slug of slugs) {
      const demos = (trinityDemos[slug] ?? (() => []))(renderTrinity, renderTrinityVm);
      assert.ok(demos.length >= 1, `${slug} has no specimen in trinity-catalog.js`);
      for (const demo of demos) {
        assert.ok(demo.html.trim().length > 0, `${slug}/${demo.title} rendered empty`);
      }
    }
  });

  it('no specimen links to a real site route', () => {
    for (const slug of slugs) {
      for (const demo of trinityDemos[slug](renderTrinity, renderTrinityVm)) {
        assert.doesNotMatch(demo.html, /href="\/(?!#)/,
          `${slug}/${demo.title} navigates to a real route — a specimen click must stay on the page`);
      }
    }
  });

  it('every component page renders, with its three files shown', () => {
    for (const slug of slugs) {
      const html = renderComponentPage(slug);
      assert.ok(html, `renderComponentPage(${slug}) returned nothing`);
      assert.match(html, /index\.html — the template/);
      assert.match(html, /styles\.css — the token sheet/);
      assert.match(html, /index\.js — the logic/);
    }
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
  // The shell is the catalog's app-shell — a sidebar and an app bar
  // composed by shell.js from the nav model, not hand-written in
  // layout.html.
  it('links every non-internal route from the rendered navigation', () => {
    for (const route of siteRoutes) {
      if (route.internal) continue;
      const html = renderRoute(route, { tasks: [], hasApi: false });
      assert.ok(
        html.includes('<aside variant="sidebar"'),
        `${route.path} renders without the sidebar`,
      );
      assert.ok(
        html.includes('<nav variant="app-bar"'),
        `${route.path} renders without the app bar`,
      );
      assert.ok(
        html.includes(`href="${route.path}"`),
        `${route.path} is published but the rendered navigation does not link to it — either link it or mark it internal`,
      );
    }
  });

  it('carries the shell-critical CSS inline, independent of the cached stylesheet chain', () => {
    // Pages' assets are cached for hours while the HTML is revalidated
    // per visit. The window chrome is inlined so a stale stylesheet
    // cannot drop the shell grid or the phone app bar (the 2026-10-20
    // incident).
    const html = renderRoute(siteRoutes[0], { tasks: [], hasApi: false });
    assert.ok(html.includes('<style data-bn-critical="shell">'), 'the shell-critical style block renders');
    const style = html.slice(html.indexOf('<style data-bn-critical="shell">'), html.indexOf('</style>', html.indexOf('<style data-bn-critical="shell">')));
    assert.ok(style.includes('aside[variant="sidebar"]'), 'the sidebar rules are inlined');
    assert.ok(style.includes('nav[variant="app-bar"]'), 'the app bar rules are inlined');
    assert.ok(style.includes('--app-bar-position: var(--position-fixed)'), 'the bar positioning is inlined');
  });

  it('the inlined shell CSS is self-contained: every token it uses, it defines or falls back', () => {
    // A var(--*) with no fallback still has to be defined — in the
    // block itself (the components' own tokens) or in tokens.css (the
    // layer-0 primitives the block maps from). A fallback is enough:
    // the shell must lay out when the stylesheet chain is stale.
    const html = renderRoute(siteRoutes[0], { tasks: [], hasApi: false });
    const style = html.slice(html.indexOf('<style data-bn-critical="shell">'), html.indexOf('</style>', html.indexOf('<style data-bn-critical="shell">')));
    const tokensCss = readFileSync(repo('packages/components/src/tokens.css'), 'utf8');
    const defined = new Set(
      [...(style + tokensCss).matchAll(/(--[a-z0-9_-]+)\s*:/g)].map((m) => m[1]),
    );
    const missing = [];
    for (const match of style.matchAll(/var\(\s*(--[a-z0-9_-]+)([^)]*)\)/g)) {
      const name = match[1];
      const hasFallback = match[2].trimStart().startsWith(',');
      if (!hasFallback && !defined.has(name)) missing.push(name);
    }
    assert.deepEqual([...new Set(missing)], [], `shell CSS references tokens it does not define: ${missing.join(', ')}`);
    assert.ok(style.includes('--app-shell-'), 'the shell layout tokens are inlined');
    assert.ok(style.includes('--sidebar-'), 'the sidebar tokens are inlined');
  });

  it('home names the installed runtime and the effect rule, with no inline style', () => {
    const html = renderRoute(siteRoutes[0], { tasks: [], hasApi: false });
    const runtime = JSON.parse(readFileSync(repo('packages/runtime/package.json'), 'utf8')).version;
    assert.ok(html.includes(runtime), 'home names the runtime version');
    assert.match(html, /BN_EFFECT_LOOP/);
    assert.equal(html.includes('style='), false);
    // The hero's actions are the catalog's link-form buttons.
    assert.match(html, /<a variant="primary" href="\/playground">/);
    // Home's lists are the catalog's list-group.
    assert.match(html, /<ul variant="default">/);
  });

  it('a route with no nav entry is marked internal, and an internal route has no nav entry', () => {
    for (const route of siteRoutes) {
      assert.equal(!route.activePage, Boolean(route.internal),
        `${route.path}: activePage "${route.activePage}" and internal ${route.internal} disagree`);
    }
    assert.ok(siteRoutes.some((r) => r.internal), 'the verification harness is still expected to be internal');
  });
});

// ─── 13b. Site syntax highlighting: a pipeline step, not hand-typed spans ───
// Highlighting used to exist only where an author hand-wrote spans into a
// view (docs alone); every other page's code rendered monochrome. The pass
// in examples/express/highlight.js runs inside renderPage, so a code block
// is highlighted because it is a code block.

describe('site syntax highlighting is a pipeline step', () => {
  it('the tokenizer splits the classes the sheet defines', () => {
    const html = highlightCode(
      "import { signal } from '@basenative/runtime';\nconst count = signal(0); // first",
    );
    assert.match(html, /<span class="kw">import<\/span>/);
    assert.match(html, /<span class="kw">from<\/span>/);
    assert.match(html, /<span class="str">'@basenative\/runtime'<\/span>/);
    assert.match(html, /<span class="fn">signal<\/span>/);
    assert.match(html, /<span class="num">0<\/span>/);
    assert.match(html, /<span class="cmt">\/\/ first<\/span>/);
  });

  it('the tokenizer colours template tags, attributes, and method calls', () => {
    const html = highlightCode('<p class="item" :class="done()">{{ count() }}</p>');
    assert.match(html, /<span class="tag">p<\/span>/);
    assert.match(html, /<span class="attr">class<\/span>/);
    assert.match(html, /<span class="attr">:class<\/span>/);
    const js = highlightCode('count.set(count() + 1);');
    assert.match(js, /<span class="fn">set<\/span>/);
    assert.match(js, /<span class="fn">count<\/span>/);
  });

  it('the tokenizer handles @-directives without stalling', () => {
    // Regression: an attribute starting with @ (@click, @if) once looped
    // the tag scanner forever — its first char was a valid attribute
    // start but not a valid attribute continuation.
    const html = highlightCode('<button @click="save($event)">Save</button>');
    assert.match(html, /<span class="attr">@click<\/span>/);
    assert.match(html, /<span class="tag">button<\/span>/);
  });

  it('highlighting preserves the code text exactly', () => {
    const code = '<div data-x="a<b">{{ a() }}</div>\nif (a < b && c > 2) run("x");';
    const text = highlightCode(code).replace(/<[^>]+>/g, '');
    assert.equal(
      text,
      code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    );
  });

  it('the pass is deterministic and leaves real markup alone', () => {
    const block = '<pre><code>const a = signal(1);</code></pre>';
    assert.equal(highlightCodeBlocks(block), highlightCodeBlocks(block));
    assert.match(highlightCodeBlocks(block), /class="kw"/);
    const placeholder = '<pre><code>// Click <em>Export</em> to render.</code></pre>';
    assert.equal(highlightCodeBlocks(placeholder), placeholder);
  });

  it('entity-escaped code round-trips into highlighted markup', () => {
    const out = highlightCodeBlocks('<pre><code>&lt;div&gt;{{ count() }}&lt;/div&gt;</code></pre>');
    assert.match(out, /<span class="tag">div<\/span>/);
    assert.equal(out.includes('&lt;span'), false, 'spans are markup; the code stays escaped');
  });

  it('CSS samples get CSS highlighting, not the JS scanner', () => {
    const css = [
      ':root { --color-tint: var(--palette-system-blue); }',
      'button[variant="primary"]:hover {',
      '  background-color: var(--color-bkg-button-primary);',
      '  padding-block: var(--spacing-2);',
      '  inline-size: 2.75rem;',
      '  &:focus-visible { outline-width: 2px; }',
      '}',
    ].join('\n');
    const html = highlightCode(css);
    assert.match(html, /<span class="kw">root<\/span>/);
    assert.match(html, /<span class="var">--color<\/span><span class="fn">-tint<\/span>/);
    assert.match(html, /<span class="fn">var<\/span>/);
    assert.match(html, /<span class="var">--palette<\/span><span class="fn">-system-blue<\/span>/);
    assert.match(html, /<span class="tag">button<\/span>/);
    assert.match(html, /<span class="attr">variant<\/span>/);
    assert.match(html, /<span class="str">"primary"<\/span>/);
    assert.match(html, /<span class="kw">hover<\/span>/);
    assert.match(html, /<span class="attr">background-color<\/span>/);
    assert.match(html, /<span class="var">--color<\/span><span class="attr">-bkg<\/span><span class="fn">-button-primary<\/span>/);
    assert.match(html, /<span class="var">--spacing<\/span><span class="num">-2<\/span>/);
    assert.match(html, /<span class="num">2.75rem<\/span>/);
    assert.match(html, /<span class="kw">focus-visible<\/span>/);
    assert.match(html, /<span class="num">2px<\/span>/);
    // The CSS scanner preserves the code text exactly, like the JS one.
    const text = html.replace(/<[^>]+>/g, '');
    assert.equal(text, css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  });

  it('custom properties are segmented by the CTI+ dynamics', () => {
    const css = [
      ':root { --color-bkg-button-primary-hover: var(--palette-primary-400); }',
      'button { color: var(--color-text-label-2); }',
      '.code-block { inline-size: var(--size-full); }',
    ].join('\n');
    const html = highlightCode(css);
    // Definition: category in var, type in attr, the item/variant
    // middle in fn, the state tail in kw — each dynamic role reads
    // distinctly, so the taxonomy structure is visible at a glance.
    assert.match(html, /<span class="var">--color<\/span><span class="attr">-bkg<\/span><span class="fn">-button-primary<\/span><span class="kw">-hover<\/span>/);
    // A palette weight is a numeric tail: it takes the number class.
    assert.match(html, /<span class="var">--palette<\/span><span class="fn">-primary<\/span><span class="num">-400<\/span>/);
    // A var() reference segments identically to a definition.
    assert.match(html, /<span class="var">--color<\/span><span class="attr">-text<\/span><span class="fn">-label<\/span><span class="num">-2<\/span>/);
    assert.match(html, /<span class="var">--size<\/span><span class="fn">-full<\/span>/);
    // Class selectors segment the same way on the tag class.
    assert.match(html, /<span class="tag">\.code<\/span><span class="fn">-block<\/span>/);
    const text = html.replace(/<[^>]+>/g, '');
    assert.equal(text, css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  });

  it('a JS file that mentions CSS stays on the JS scanner', () => {
    const js = "const sheet = ':root { --a: 1; }';\nexport const x = { color: 'red' };";
    const html = highlightCode(js);
    assert.match(html, /<span class="kw">const<\/span>/);
    assert.match(html, /<span class="kw">export<\/span>/);
  });

  it('every rendered page highlights its code blocks', () => {
    for (const route of siteRoutes) {
      if (route.internal) continue;
      const html = renderRoute(route, { tasks: [], hasApi: false });
      const blocks = [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>/g)].map(
        (m) => m[1],
      );
      for (const inner of blocks) {
        // A block with no code in it has nothing to highlight. The
        // playground's editor panes ship an empty, aria-hidden
        // highlight layer (<pre class="hl"><code></code>) that the
        // page's own script fills as the reader types; the contract
        // below covers code a page actually renders.
        if (!inner.trim()) continue;
        if (inner.includes('<') && !inner.includes('<span class=')) continue;
        assert.ok(
          inner.includes('<span class='),
          `${route.path} renders a code block with no highlighting`,
        );
      }
    }
    const componentHtml = renderComponentPage('button');
    assert.match(componentHtml, /<span class="kw">import<\/span>/);
  });

  it('no view hand-writes highlight spans any more', () => {
    const viewsDir = repo('examples/express/views');
    for (const name of readdirSync(viewsDir)) {
      const text = readFileSync(`${viewsDir}/${name}`, 'utf8');
      assert.equal(
        /class="(kw|str|fn|num|cmt|tag|attr)"/.test(text),
        false,
        `${name} hand-writes highlight spans`,
      );
    }
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

  it('the package exports the twelve initialisers the catalogue relies on', () => {
    assert.deepEqual(
      shipped.sort(),
      [
        'initAppNav', 'initCalendarDragDrop', 'initCommandPalette', 'initDataGrid', 'initDrawer', 'initDropdownMenu',
        'initMultiselect', 'initPipelineDragDrop', 'initSiteHeader', 'initTabs', 'initTree', 'initVirtualList',
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



describe('/showcase client script wires only the page furniture', () => {
  const showcase = readFileSync(repo('examples/express/public/showcase.js'), 'utf8');

  it('wires the section filter and the TOC tracking', () => {
    assert.match(showcase, /wireShowcaseFilter\(\);/);
    assert.match(showcase, /wireShowcaseToc\(\);/);
  });

  it('carries no wiring for markup the trinity showcase no longer renders', () => {
    assert.doesNotMatch(showcase, /init(Tabs|Drawer|DropdownMenu|CommandPalette|VirtualList)/);
    assert.doesNotMatch(showcase, /data-bn="(tabs|dialog|drawer|dropdown|command-palette|virtualizer)"/);
  });
});

describe('the builder bundle registers the elements /builder needs', () => {
  // Regression guard: builder-entry.js once reached esbuild as a bare
  // side-effect import and the bundle came out as the entry shim alone
  // (580 bytes, no registration) — /builder rendered an empty page in
  // production. The bundle is a committed build output; pin that it
  // carries the element registrations.
  const bundle = readFileSync(repo('examples/express/public/builder.js'), 'utf8');

  it('contains the builder package, not just the entry shim', () => {
    assert.ok(bundle.length > 10000, 'builder bundle should contain the builder package');
    for (const tag of ['bn-builder', 'bn-builder-palette', 'bn-builder-canvas']) {
      assert.ok(bundle.includes(tag), `builder bundle should register ${tag}`);
    }
  });
});

describe('the /ai scorecard keeps every point against BaseNative', () => {
  const route = siteRoutes.find((entry) => entry.path === '/ai');
  const html = renderRoute(route, { tasks: [], hasApi: false });

  it('is a published route linked from the navigation', () => {
    assert.ok(route && !route.internal);
    assert.equal(route.activePage, 'ai');
    assert.match(html, /href="\/ai"/);
  });

  it('renders every checklist row', () => {
    for (const item of AI_SCORECARD) {
      assert.ok(html.includes(item.point), `missing point: ${item.point}`);
      assert.ok(html.includes(item.status), `missing status for ${item.id}`);
    }
  });

  it('says the natural effect pattern runs once, and names the loop error', () => {
    assert.match(html, /runs once/);
    assert.match(html, /BN_EFFECT_LOOP/);
  });

  it('does not confuse the page with greenput.com/ai', () => {
    assert.match(html, /greenput\.com\/ai/);
    // The sourcing note stays; the internal process narrative that used
    // to sit above the scorecard (the git-history account, "no commit by
    // Muse") does not — public pages carry no working notes.
    assert.doesNotMatch(html, /no commit by Muse/);
    assert.doesNotMatch(html, /Where this list came from/);
  });
});

// ─── 13c. Site footer: rendered from the nav model by the catalog component ──
// The layout used to hand-write the footer: it omitted five routes and
// carried a differently-cased GitHub URL. It is now the catalog's
// site-footer fed by getAppNavItems, so the footer and the nav cannot
// drift apart.

describe('site footer is rendered from the nav model', () => {
  const html = renderRoute(siteRoutes[0], { tasks: [], hasApi: false });
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));

  it('carries the trinity site-footer contract', () => {
    assert.match(footer, /<footer variant="default">/);
  });

  it('names its first landmark Project, not BaseNative', () => {
    // The catalog's demo footers already use "BaseNative" as a nav
    // name; a second one would trip axe's landmark-unique rule on
    // pages that embed the catalog.
    assert.match(footer, /<nav aria-label="Project">\s*<p>BaseNative<\/p>/);
    assert.ok(!footer.includes('aria-label="BaseNative"'));
  });

  it('links every route in the nav model exactly once', () => {
    for (const item of getAppNavItems()) {
      const count = footer.split(`href="${item.href}"`).length - 1;
      assert.equal(count, 1, `footer should link ${item.href} once, got ${count}`);
    }
  });

  it('links GitHub with the canonical casing', () => {
    assert.ok(footer.includes('href="https://github.com/DuganLabs/BaseNative"'));
    assert.ok(!footer.includes('DuganLabs/basenative'));
  });

  it('the layout no longer hand-writes the footer', () => {
    const layout = readFileSync(repo('examples/express/views/layout.html'), 'utf8');
    assert.ok(layout.includes('<!--FOOTER-->'));
    assert.ok(!layout.includes('<footer'));
  });
});

describe('the contents navs have a working scrollspy', () => {
  const tocLinks = (html, navAttr) => {
    const nav = html.slice(html.indexOf(navAttr), html.indexOf('</nav>', html.indexOf(navAttr)));
    return [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  };

  it('/docs: every contents link resolves to a section on the page', () => {
    const route = siteRoutes.find((r) => r.path === '/docs');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    const ids = tocLinks(html, 'data-bn-docs-toc');
    assert.ok(ids.length >= 4, `expected the /docs contents list, got ${ids.length} links`);
    for (const id of ids) {
      assert.ok(html.includes(`id="${id}"`), `/docs contents link #${id} has no target section`);
      const count = html.split(`id="${id}"`).length - 1;
      assert.equal(count, 1, `/docs should carry id="${id}" exactly once, got ${count}`);
    }
  });

  it('/components: every category filter maps to a section on the page', () => {
    const route = siteRoutes.find((r) => r.path === '/components');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    const barAt = html.indexOf('data-bn-component-filters');
    const bar = html.slice(barAt, html.indexOf('</nav>', barAt));
    const cats = [...bar.matchAll(/data-bn-component-filter="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((c) => c !== 'all');
    assert.ok(cats.length >= 3, `expected the /components category filters, got ${cats.length}`);
    for (const cat of cats) {
      assert.ok(
        html.includes(`id="cat-${cat}"`),
        `/components filter "${cat}" has no target section`,
      );
    }
  });

  it('every page loads the scrollspy script', () => {
    const route = siteRoutes.find((r) => r.path === '/docs');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    assert.ok(html.includes('src="/scrollspy.js?v='), 'rendered page should load /scrollspy.js');
  });

  it('the scrollspy observes the TOC targets and marks the current link', () => {
    const src = readFileSync(repo('examples/express/public/scrollspy.js'), 'utf8');
    assert.ok(src.includes('IntersectionObserver'), 'scrollspy should use IntersectionObserver');
    assert.ok(src.includes('data-bn-docs-toc'), 'scrollspy should cover the /docs contents nav');
    assert.ok(src.includes('data-bn-component-toc'), 'scrollspy should cover the /components TOC');
    assert.ok(
      src.includes('data-bn-component-filter'),
      'scrollspy should mark the /components filter bar (the surviving nav)',
    );
    assert.ok(src.includes("setAttribute('aria-current', 'true')"), 'scrollspy should set aria-current');
    assert.ok(src.includes("removeAttribute('aria-current')"), 'scrollspy should clear stale marks');
  });

  it('the current TOC link takes the app nav current treatment', () => {
    const css = readFileSync(repo('examples/express/public/styles.css'), 'utf8');
    const tocBlock = css.slice(css.indexOf('[data-bn-component-toc],'));
    const at = tocBlock.indexOf("&[aria-current='true']");
    assert.ok(at > -1, 'the TOC block should carry an aria-current rule');
    const rule = tocBlock.slice(at, at + 300);
    assert.ok(rule.includes('var(--bn-brand)'), 'current TOC link should fill with --bn-brand');
    assert.ok(rule.includes('var(--bn-brand-ink)'), 'current TOC link should label with --bn-brand-ink');
    const filtersBlock = css.slice(css.indexOf('[data-bn-component-filters]'));
    const fat = filtersBlock.indexOf("&[aria-current='true']");
    assert.ok(fat > -1, 'the filter buttons should carry an aria-current rule');
    const frule = filtersBlock.slice(fat, fat + 300);
    assert.ok(frule.includes('var(--bn-brand)'), 'current filter should fill with --bn-brand');
    assert.ok(frule.includes('var(--bn-brand-ink)'), 'current filter should label with --bn-brand-ink');
  });

  it('the static export ships the scrollspy script', () => {
    const build = readFileSync(repo('scripts/build-pages.js'), 'utf8');
    assert.ok(build.includes("'scrollspy.js'"), 'build-pages.js should copy scrollspy.js into dist');
  });
});
