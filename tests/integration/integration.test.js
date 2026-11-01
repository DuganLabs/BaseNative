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
import {
  createField,
  createForm,
  required,
  minLength,
  email,
} from '../../packages/forms/src/index.js';
import { defineConfig, string, optional } from '../../packages/config/src/index.js';
import { createLogger } from '../../packages/logger/src/index.js';
import { createI18n } from '../../packages/i18n/src/index.js';
import { createFlagManager, createMemoryProvider } from '../../packages/flags/src/index.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkComparePage, capabilityProblems } from '../../scripts/check-compare-page.js';
import { computeCompareStats } from '../../scripts/compare-stats.js';
import {
  renderRoute,
  renderComponentPage,
  siteRoutes,
  componentStylesheets,
  componentTemplates,
  renderPlaygroundPreview,
} from '../../examples/express/page.js';
import { highlightCode, highlightCodeBlocks } from '../../examples/express/highlight.js';
import { HIGHLIGHTERS } from '../../examples/express/public/highlight-engine.js';
import { AI_SCORECARD } from '../../examples/express/ai-scorecard.js';
import { trinityDemos } from '../../examples/express/trinity-catalog.js';
import {
  renderTrinity,
  renderTrinityVm,
  trinityComponentInfo,
} from '../../examples/express/trinity.js';
import { getAppNavItems } from '../../examples/express/site-data.js';
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
    const items = [
      { id: 1, name: 'Apple' },
      { id: 2, name: 'Banana' },
    ];
    const html = render(
      '<ul><template @for="item of items; track item.id"><li>{{ item.name }}</li></template></ul>',
      { items },
    );
    assert.ok(html.includes('<li>Apple</li>'));
    assert.ok(html.includes('<li>Banana</li>'));
    const sig = signal(items);
    assert.deepEqual(sig(), items);
  });

  it('@if/@else renders correct branch', () => {
    const tpl =
      '<template @if="show"><span>yes</span></template><template @else><span>no</span></template>';
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
      const route = routes.find((r) => r.name === match.name);
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
    assert.ok(entries.some((e) => e.msg === 'test message'));
  });

  it('logger child context propagates to entries', () => {
    const entries = [];
    const logger = createLogger({
      level: 'info',
      transport: { write: (entry) => entries.push(entry) },
    });
    const child = logger.child({ requestId: 'req-1' });
    child.info('child log');
    assert.ok(entries.some((e) => e.requestId === 'req-1'));
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
    const dispose = effect(() => {
      log.push(count());
    });
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
      beta: { enabled: true, percentage: 100 },
    });
    const flags = createFlagManager(provider);

    const newUI = await flags.isEnabled('new-ui', {});
    const beta = await flags.isEnabled('beta', {});

    const tpl =
      '<template @if="show"><div>New</div></template><template @else><div>Old</div></template>';
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
    assert.ok(logs.every((l) => l.requestId === 'req-1'));
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
    const form = createForm({
      email: createField('', { validators: [required(), email()] }),
      name: createField('', { validators: [required(), minLength(2)] }),
    });

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

  it('/playground gives the console its own area, outside the editor tabs', () => {
    const route = siteRoutes.find((r) => r.path === '/playground');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    const tabs = html.match(/<section variant="tabs"[\s\S]*?<section aria-label="Result">/);
    assert.ok(tabs, '/playground renders its editor tabs before the result');
    assert.doesNotMatch(tabs[0], /aria-label="Console"/, 'the console sits inside an editor tab');
    assert.match(html, /<section class="console-region" aria-label="Console">/);
  });

  it('/compare no longer denies HMR while @basenative/hmr ships', () => {
    const route = siteRoutes.find((r) => r.path === '/compare');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    assert.doesNotMatch(html, /\bNo HMR\b/i);
    assert.match(html, /HMR \(<code>@basenative\/<wbr>hmr<\/code>\)/);
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
        assert.doesNotMatch(
          demo.html,
          /href="\/(?!#)/,
          `${slug}/${demo.title} navigates to a real route — a specimen click must stay on the page`,
        );
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

describe('the /components app demo tells the static visitor where their tasks go', () => {
  const componentsRoute = siteRoutes.find((r) => r.path === '/components');

  it('discloses that the static build does not persist, and only there', () => {
    const staticHtml = renderRoute(componentsRoute, { tasks: [], hasApi: false });
    assert.match(
      staticHtml,
      /not saved to a server/i,
      'the /components app demo must disclose that the static build does not persist',
    );
    const apiHtml = renderRoute(componentsRoute, { tasks: [], hasApi: true });
    assert.doesNotMatch(
      apiHtml,
      /not saved to a server/i,
      'the disclosure must not appear when the API is live',
    );
  });

  it('persists to localStorage in the same file as the signals', () => {
    const view = readFileSync(repo('examples/express/views/components.html'), 'utf8');
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
    assert.ok(
      html.includes('<style data-bn-critical="shell">'),
      'the shell-critical style block renders',
    );
    const style = html.slice(
      html.indexOf('<style data-bn-critical="shell">'),
      html.indexOf('</style>', html.indexOf('<style data-bn-critical="shell">')),
    );
    assert.ok(style.includes('aside[variant="sidebar"]'), 'the sidebar rules are inlined');
    assert.ok(style.includes('nav[variant="app-bar"]'), 'the app bar rules are inlined');
    assert.ok(style.includes('nav[variant="app-bar"]'), 'the bar rules are inlined');
    assert.ok(
      readFileSync(repo('packages/components/src/tokens.css'), 'utf8').includes(
        '--position-app-bar: var(--position-fixed)',
      ),
      'the bar positioning token is in the generated sheet',
    );
  });

  it('the inlined shell CSS is self-contained: every token it uses, it defines or falls back', () => {
    // A var(--*) with no fallback still has to be defined — in the
    // block itself (the components' own tokens) or in tokens.css (the
    // layer-0 primitives the block maps from). A fallback is enough:
    // the shell must lay out when the stylesheet chain is stale.
    const html = renderRoute(siteRoutes[0], { tasks: [], hasApi: false });
    const style = html.slice(
      html.indexOf('<style data-bn-critical="shell">'),
      html.indexOf('</style>', html.indexOf('<style data-bn-critical="shell">')),
    );
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
    assert.deepEqual(
      [...new Set(missing)],
      [],
      `shell CSS references tokens it does not define: ${missing.join(', ')}`,
    );
    assert.ok(style.includes('main[variant='), 'the shell layout rules are inlined');
    assert.ok(style.includes('aside[variant='), 'the sidebar rules are inlined');
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
      assert.equal(
        !route.activePage,
        Boolean(route.internal),
        `${route.path}: activePage "${route.activePage}" and internal ${route.internal} disagree`,
      );
    }
    assert.ok(
      siteRoutes.some((r) => r.internal),
      'the verification harness is still expected to be internal',
    );
  });
});

// ─── 13b. Site syntax highlighting: a pipeline step, not hand-typed spans ───
// Highlighting used to exist only where an author hand-wrote spans into a
// view (docs alone); every other page's code rendered monochrome. The pass
// in examples/express/highlight.js runs inside renderPage, so a code block
// is highlighted because it is a code block. The tokenizer is the
// playground's own engine (public/highlight-engine.js) — one
// implementation for the editors and the site, tk-* classes throughout;
// the site pass previously carried a second, divergent scanner.

describe('site syntax highlighting is a pipeline step', () => {
  it('the tokenizer splits the classes the sheet defines', () => {
    const html = highlightCode(
      "import { signal } from '@basenative/runtime';\nconst count = signal(0); // first",
    );
    assert.match(html, /<b>const<\/b>/);
    assert.match(html, /<mark>'@basenative\/runtime'<\/mark>/);
    assert.match(html, /<dfn>signal<\/dfn>/);
    assert.match(html, /<data>0<\/data>/);
    assert.match(html, /<i>\/\/ first<\/i>/);
  });

  it('the tokenizer colours template tags, attributes, and method calls', () => {
    const html = highlightCode('<p class="item" :class="done()">{{ count() }}</p>');
    assert.match(html, /<strong>p<\/strong>/);
    assert.match(html, /<abbr>class<\/abbr>/);
    assert.match(html, /<samp>:class<\/samp>/);
    assert.match(html, /<kbd>{{ count\(\) }}<\/kbd>/);
    const js = highlightCode('count.set(count() + 1);');
    assert.match(js, /<em>set<\/em>/);
    assert.match(js, /<em>count<\/em>/);
  });

  it('the tokenizer handles @-directives without stalling', () => {
    // Regression: an attribute starting with @ (@click, @if) once looped
    // the tag scanner forever — its first char was a valid attribute
    // start but not a valid attribute continuation.
    const html = highlightCode('<button @click="save($event)">Save</button>');
    assert.match(html, /<dfn>@click<\/dfn>/);
    assert.match(html, /<strong>button<\/strong>/);
  });

  it('highlighting preserves the code text exactly', () => {
    const code = '<div data-x="a<b">{{ a() }}</div>\nif (a < b && c > 2) run("x");';
    // Read the highlighted markup back the way a browser serves it:
    // drop the engine's spans and unescape. The playground's tag
    // scanner leaves a tag's closing > raw (valid in text content),
    // so a naive tag-strip would eat it — the contract is that the
    // text a reader copies is the code, byte for byte.
    const text = highlightCode(code)
      .replace(/<\/?(?:b|i|em|strong|mark|abbr|dfn|samp|data|kbd|cite|small)>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    assert.equal(text, code);
  });

  it('the pass is deterministic and leaves real markup alone', () => {
    const block = '<pre><code>const a = signal(1);</code></pre>';
    assert.equal(highlightCodeBlocks(block), highlightCodeBlocks(block));
    assert.match(highlightCodeBlocks(block), /><b>/);
    const placeholder = '<pre><code>// Click <em>Export</em> to render.</code></pre>';
    assert.equal(highlightCodeBlocks(placeholder), placeholder);
  });

  it('entity-escaped code round-trips into highlighted markup', () => {
    const out = highlightCodeBlocks('<pre><code>&lt;div&gt;{{ count() }}&lt;/div&gt;</code></pre>');
    assert.match(out, /<strong>div<\/strong>/);
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
    // The playground's CSS engine colours comments, custom properties
    // (segmented — see the next test), braces, property names, strings,
    // numbers and at-rules; selectors and pseudo-classes stay plain, in
    // the editors and here alike.
    assert.match(html, /--<b>color<\/b>-<cite>tint<\/cite>/);
    assert.match(html, /--<b>palette<\/b>-<cite>system<\/cite>-<cite>blue<\/cite>/);
    assert.match(html, /<mark>"primary"<\/mark>/);
    assert.match(html, /<abbr>background-color<\/abbr>/);
    assert.match(html, /--<b>color<\/b>-<em>bkg<\/em>-<cite>button<\/cite>-<cite>primary<\/cite>/);
    assert.match(html, /--<b>spacing<\/b>-<cite>2<\/cite>/);
    assert.match(html, /<data>2.75rem<\/data>/);
    assert.match(html, /<abbr>outline-width<\/abbr>/);
    assert.match(html, /<data>2px<\/data>/);
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
    // The playground's segmentation: the -- stays plain, then category,
    // type, one span per item segment, and the state tail — each dynamic
    // role reads distinctly, so the taxonomy structure is visible at a
    // glance.
    assert.match(
      html,
      /--<b>color<\/b>-<em>bkg<\/em>-<cite>button<\/cite>-<cite>primary<\/cite>-<small>hover<\/small>/,
    );
    // A palette weight is a numeric tail: it takes the state class.
    assert.match(html, /--<b>palette<\/b>-<cite>primary<\/cite>-<small>400<\/small>/);
    // A var() reference segments identically to a definition.
    assert.match(html, /--<b>color<\/b>-<em>text<\/em>-<cite>label<\/cite>-<small>2<\/small>/);
    assert.match(html, /--<b>size<\/b>-<cite>full<\/cite>/);
    const text = html.replace(/<[^>]+>/g, '');
    assert.equal(text, css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  });

  it('a JS file that mentions CSS stays on the JS scanner', () => {
    const js = "const sheet = ':root { --a: 1; }';\nexport const x = { color: 'red' };";
    const html = highlightCode(js);
    assert.match(html, /<b>const<\/b>/);
    // The CSS-looking string is a JS string token, not CSS: the JS
    // scanner ran.
    assert.match(html, /<mark>':root \{ --a: 1; \}'<\/mark>/);
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
        const marked = /<(?:b|strong|mark|em|dfn|i|abbr|samp|data|kbd)\b/.test(inner);
        if (inner.includes('<') && !marked) continue;
        assert.ok(marked, `${route.path} renders a code block with no highlighting`);
      }
    }
    const componentHtml = renderComponentPage('button');
    assert.match(componentHtml, /<(?:b|dfn|strong)>/);
  });

  it('the site and the playground run the one shared engine', () => {
    // The engine lives in public/highlight-engine.js. highlight.js
    // imports it for the server pass; playground.js imports it as a
    // module for the editors. Neither carries a tokenizer of its own —
    // a second implementation is what this test exists to prevent.
    const site = readFileSync(repo('examples/express/highlight.js'), 'utf8');
    assert.match(site, /from '\.\/public\/highlight-engine\.js'/);
    assert.equal(site.includes('segmentTokenName('), false);
    const playground = readFileSync(repo('examples/express/public/playground.js'), 'utf8');
    assert.match(playground, /from '\/highlight-engine\.js'/);
    assert.equal(playground.includes('function segmentTokenName'), false);
    assert.equal(playground.includes('function hlCSS'), false);
    // Same input, same output: the pass and the pane agree byte for byte.
    assert.equal(
      highlightCode('button { color: var(--color-text-label); }'),
      HIGHLIGHTERS.css('button { color: var(--color-text-label); }'),
    );
    assert.equal(
      highlightCode('count.set(count() + 1);'),
      HIGHLIGHTERS.js('count.set(count() + 1);'),
    );
    assert.equal(
      highlightCode('<p class="x">{{ y() }}</p>'),
      HIGHLIGHTERS.html('<p class="x">{{ y() }}</p>'),
    );
  });

  it('the static export ships the highlight engine the playground imports', () => {
    // playground.js imports '/highlight-engine.js' by absolute path; the
    // dev server serves public/ so it resolves there, but the export only
    // ships what build-pages.js copies — when the copy was missing, the
    // module 404'd in production and no example ever loaded.
    const build = readFileSync(repo('scripts/build-pages.js'), 'utf8');
    assert.ok(
      build.includes("'highlight-engine.js'"),
      'build-pages.js should copy highlight-engine.js into dist',
    );
  });

  it('no view hand-writes highlight spans any more', () => {
    const viewsDir = repo('examples/express/views');
    for (const name of readdirSync(viewsDir)) {
      const text = readFileSync(`${viewsDir}/${name}`, 'utf8');
      assert.equal(
        /class="tk-(com|tag|attr|dir|bind|str|kw|fn|num|interp|cp-[a-z]+)"/.test(text),
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
    for (const [fn, doc] of [
      ['signal', 'runtime'],
      ['computed', 'runtime'],
      ['effect', 'runtime'],
      ['hydrate', 'runtime'],
      ['render', 'server'],
    ]) {
      assert.match(
        docs,
        new RegExp(`href="[^"]*docs/api/${doc}\\.md[^"]*"[^>]*>Full <code>${fn}\\(\\)</code>`),
        `${fn}() on /docs does not link to docs/api/${doc}.md`,
      );
    }
  });

  it('every package the /docs description names is linked to an existing docs/api reference', () => {
    const route = siteRoutes.find((r) => r.path === '/docs');
    const named = route.description.match(/@basenative\/[a-z-]+/g);
    assert.ok(named.length >= 2, 'the description should name the packages it covers');
    for (const pkg of new Set(named)) {
      const short = pkg.replace('@basenative/', '');
      assert.ok(
        docs.includes(`docs/api/${short}.md`),
        `${pkg} is promised by the /docs description but not linked from docs.html`,
      );
    }
    for (const short of docs
      .match(/docs\/api\/([a-z-]+)\.md/g)
      .map((m) => m.slice('docs/api/'.length, -'.md'.length))) {
      assert.ok(
        existsSync(repo(`docs/api/${short}.md`)),
        `docs.html links docs/api/${short}.md, which does not exist`,
      );
    }
  });
});

// ─── 16. /components/* run the package's own view models ──────────
// The catalogue promised filtering, sorting, expand/collapse, chip editing,
// arrow keys and windowing while the site bundle shipped no behavior at all
// and the demos hand-rolled click-only copies of patterns the package
// already had. Since the trinity migration the behavior lives in each
// component's create(); the bundle ships every component aggregate so a
// page can run the package's own view models.

describe('the site bundle ships every component aggregate the package exports', () => {
  const shipped = Object.entries(components)
    .filter(
      ([, value]) =>
        value &&
        typeof value === 'object' &&
        typeof value.create === 'function' &&
        typeof value.name === 'string',
    )
    .map(([name]) => name);
  const entry = readFileSync(repo('examples/express/basenative-entry.js'), 'utf8');
  const bundle = readFileSync(repo('examples/express/public/basenative.js'), 'utf8');
  // esbuild's ESM output ends in one `export { … }` block; that list is what a
  // page can import from /basenative.js.
  const exported = bundle
    .match(/export\s*\{([^}]*)\}\s*;?\s*$/)[1]
    .split(',')
    .map((name) =>
      name
        .trim()
        .split(/\s+as\s+/)
        .pop(),
    )
    .filter(Boolean);

  it('the package exports the whole catalog as aggregates', () => {
    assert.deepEqual(shipped.sort(), [
      'accordion',
      'alert',
      'appBar',
      'appShell',
      'avatar',
      'badge',
      'breadcrumb',
      'button',
      'calendar',
      'card',
      'checkbox',
      'choiceGroup',
      'codeBlock',
      'combobox',
      'commandPalette',
      'datagrid',
      'dialog',
      'drawer',
      'dropdownMenu',
      'emptyState',
      'field',
      'form',
      'hero',
      'input',
      'listGroup',
      'multiselect',
      'pagination',
      'pipeline',
      'progress',
      'radio',
      'rating',
      'searchField',
      'segmentedControl',
      'select',
      'sidebar',
      'siteFooter',
      'stepper',
      'table',
      'tabs',
      'textarea',
      'themeToggle',
      'toast',
      'toggle',
      'toolbar',
      'tooltip',
      'tree',
      'virtualizer',
    ]);
  });

  it('basenative-entry.js re-exports each one and the committed bundle carries it', () => {
    for (const name of shipped) {
      assert.ok(
        entry.includes(name),
        `${name} is missing from examples/express/basenative-entry.js`,
      );
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
    const ids = tocLinks(html, 'variant="subnav"');
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
    const barAt = html.indexOf('variant="subnav"');
    const bar = html.slice(barAt, html.indexOf('</aside>', barAt));
    const cats = [...bar.matchAll(/value="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((c) => c && c !== 'all');
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

  it("every page maps the bare '/basenative.js' import to this deploy's versioned bundle", () => {
    // External modules (specimens.js, hero-demo.js, playground code)
    // import '/basenative.js' unversioned; the version stamp never
    // reaches inside them, so without the map a cached bundle outlives
    // a deploy and pairs with newer page scripts.
    for (const route of siteRoutes) {
      const html = renderRoute(route, { tasks: [], hasApi: false });
      const maps = [...html.matchAll(/<script type="importmap">([^<]*)<\/script>/g)];
      assert.equal(maps.length, 1, `${route.path}: expected one import map, got ${maps.length}`);
      const version = /src="\/boot\.js\?v=([0-9a-f]+)"/.exec(html)?.[1];
      assert.ok(version, `${route.path}: boot.js is not versioned`);
      assert.deepEqual(JSON.parse(maps[0][1]), {
        imports: { '/basenative.js': `/basenative.js?v=${version}` },
      });
      assert.ok(
        html.indexOf('<script type="importmap">') === html.indexOf('<script'),
        `${route.path}: the import map must precede every other script`,
      );
    }
  });

  it('the playground preview document is versioned like every page', () => {
    const html = renderPlaygroundPreview();
    const version = /src="\/playground-preview\.js\?v=([0-9a-f]+)"/.exec(html)?.[1];
    assert.ok(version, 'the preview script is not versioned');
    const map = /<script type="importmap">([^<]*)<\/script>/.exec(html);
    assert.ok(map, 'the preview has no import map');
    assert.deepEqual(JSON.parse(map[1]), {
      imports: { '/basenative.js': `/basenative.js?v=${version}` },
    });
    assert.ok(html.indexOf('<script type="importmap">') === html.indexOf('<script'));
    const build = readFileSync(repo('scripts/build-pages.js'), 'utf8');
    assert.ok(build.includes('renderPlaygroundPreview()'), 'the export copies the raw preview');
  });

  it('the asset version covers every component template the specimens fetch', () => {
    const files = componentTemplates().map((f) => f.split('/src/')[1]);
    assert.ok(files.includes('combobox/index.html'), 'combobox template not hashed');
    assert.ok(files.includes('tree/index.html'), 'tree template not hashed');
    const src = readFileSync(repo('examples/express/public/specimens.js'), 'utf8');
    assert.match(src, /fetch\(versioned\(`\/bn-css\/\$\{name\}\/index\.html`\)\)/);
  });

  it('the scrollspy observes the TOC targets and marks the current link', () => {
    const src = readFileSync(repo('examples/express/public/scrollspy.js'), 'utf8');
    assert.ok(src.includes('IntersectionObserver'), 'scrollspy should use IntersectionObserver');
    assert.ok(src.includes('aside[variant="subnav"]'), 'scrollspy should cover the one subnav');
    assert.ok(!src.includes('aside[variant="chips"]'), 'scrollspy should not keep a second nav');
    assert.ok(
      src.includes("setAttribute('aria-current', 'true')"),
      'scrollspy should set aria-current',
    );
    assert.ok(
      src.includes("removeAttribute('aria-current')"),
      'scrollspy should clear stale marks',
    );
  });

  it('the current TOC link takes the sidebar current treatment', () => {
    const sidebar = readFileSync(repo('packages/components/src/sidebar/styles.css'), 'utf8');
    assert.ok(sidebar.includes("aside[variant='subnav']"), 'subnav variant is styled');
    assert.ok(!sidebar.includes("aside[variant='chips']"), 'the chips variant is gone');
    assert.ok(sidebar.includes("[aria-pressed='true']"), 'pressed items share the current fill');
    assert.ok(
      sidebar.includes('--color-bkg-sidebar-link-current'),
      'the current item uses the sidebar fill token',
    );
  });

  it('the static export ships the scrollspy script', () => {
    const build = readFileSync(repo('scripts/build-pages.js'), 'utf8');
    assert.ok(
      build.includes("'scrollspy.js'"),
      'build-pages.js should copy scrollspy.js into dist',
    );
  });
});

// ─── Layout conformance: server-rendered markup ────────────────────
// Rules from the 2026-10-31 sweep (docs/conformance.md). The stack and
// section gaps come from the shell's CSS; these keep every page's
// markup in the shape that CSS keys on, with no hand spacing.

describe('component pages are built from the shared stack, not hand spacing', () => {
  const slugs = readdirSync(repo('packages/components/src'), { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && existsSync(repo(`packages/components/src/${d.name}/index.html`)),
    )
    .map((d) => d.name);

  it('every page sets its blocks as children of variant-free sections the stack primitive spaces', () => {
    for (const slug of slugs) {
      const html = renderComponentPage(slug);
      assert.ok(html, `${slug} renders`);
      const files = html.match(/<section data-bn-component-files[^>]*>/);
      assert.ok(files, `${slug} has a files section`);
      assert.doesNotMatch(
        files[0],
        /\svariant=/,
        `${slug}: the files section must not opt out of the stack`,
      );
      const sources = html.match(/<figure[^>]*data-bn-component-source/g) || [];
      assert.ok(sources.length >= 1, `${slug} shows its source files`);
    }
  });

  it('no page spaces a block by hand with an inline margin', () => {
    for (const slug of slugs) {
      const html = renderComponentPage(slug);
      assert.doesNotMatch(html, /style="[^"]*margin/, `${slug} carries an inline margin`);
    }
    for (const route of siteRoutes) {
      const html = renderRoute(route, { tasks: [], hasApi: false });
      assert.doesNotMatch(html, /style="[^"]*margin/, `${route.path} carries an inline margin`);
    }
  });
});

describe('the asset version covers every stylesheet the CSS chain is built from', () => {
  it('hashes each component styles.css, so a component restyle busts cached trinity.css', () => {
    const hashed = new Set(
      componentStylesheets().map((f) => f.split('packages/components/src/')[1]),
    );
    for (const d of readdirSync(repo('packages/components/src'), { withFileTypes: true })) {
      if (d.isDirectory() && existsSync(repo(`packages/components/src/${d.name}/styles.css`))) {
        assert.ok(
          hashed.has(`${d.name}/styles.css`),
          `${d.name}/styles.css is outside the asset version`,
        );
      }
    }
  });
});

describe('table cells set identifiers as code, so prose never breaks mid-word', () => {
  it('the /ai scorecard wraps package specs, globals and calls in <code>', () => {
    const route = siteRoutes.find((r) => r.path === '/ai');
    assert.ok(route, '/ai is a site route');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    const table = html.match(/<table[\s\S]*?<\/table>/);
    assert.ok(table, '/ai renders its scorecard table');
    const cells = table[0].match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    const bare = /(^|[^>\w/.$])(@basenative\/[a-z-]+|globalThis\.[\w$]+|[A-Za-z_$][\w$]*\(\))/;
    for (const cell of cells) {
      const prose = cell.replace(/<code>[\s\S]*?<\/code>/g, '');
      assert.doesNotMatch(prose, bare, `an identifier outside <code>: ${cell.slice(0, 120)}`);
    }
    assert.match(table[0], /<code>globalThis\.<wbr>__BASENATIVE_<wbr>DEVTOOLS__<\/code>/);
  });

  it('the /compare tables set identifiers as code and let a slash compound break after the slash', () => {
    const route = siteRoutes.find((r) => r.path === '/compare');
    const html = renderRoute(route, { tasks: [], hasApi: false });
    const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
    assert.ok(tables.length > 0, '/compare renders its tables');
    const bare = /(^|[^>\w/.$])(@basenative\/[a-z-]+|globalThis\.[\w$]+|[A-Za-z_$][\w$]*\(\))/;
    for (const table of tables) {
      for (const cell of table.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/g) || []) {
        const prose = cell
          .replace(/<code>[\s\S]*?<\/code>/g, '')
          .replace(/<[^>]+>/g, (tag) => (tag === '<wbr>' ? tag : ' '));
        assert.doesNotMatch(prose, bare, `an identifier outside <code>: ${cell.slice(0, 120)}`);
        assert.doesNotMatch(
          prose,
          /[A-Za-z]{2}\/[A-Za-z]{2}/,
          `a slash compound with no break: ${cell.slice(0, 120)}`,
        );
      }
    }
    assert.match(html, /<code>@basenative\/<wbr>hmr<\/code>/);
  });
});

describe('inline code wraps between identifier parts, never inside a name', () => {
  it('cell identifiers get a break after each dot or slash and at snake_case words', async () => {
    const { codeHtml, cellProse } = await import('../../examples/express/cell-prose.js');
    assert.equal(
      codeHtml('globalThis.__BASENATIVE_DEVTOOLS__'),
      'globalThis.<wbr>__BASENATIVE_<wbr>DEVTOOLS__',
    );
    assert.equal(codeHtml('@basenative/integrations'), '@basenative/<wbr>integrations');
    assert.equal(codeHtml('render()'), 'render()');
    assert.equal(codeHtml('a<b'), 'a&lt;b');
    assert.match(
      cellProse('reads @basenative/validate'),
      /<code>@basenative\/<wbr>validate<\/code>/,
    );
  });

  it('long path code on component and docs pages carries break opportunities', () => {
    const views = new URL('../../examples/express/views/', import.meta.url);
    const component = readFileSync(new URL('component.html', views), 'utf8');
    const docs = readFileSync(new URL('docs.html', views), 'utf8');
    for (const [name, html] of [
      ['component.html', component],
      ['docs.html', docs],
    ]) {
      for (const [, code] of html.matchAll(/<code>(packages\/[^<]*(?:<wbr>[^<]*)*)<\/code>/g)) {
        assert.doesNotMatch(
          code,
          /[\w-]\/(?!<wbr>)[\w{]/,
          `${name}: a path with no break after a slash: ${code}`,
        );
      }
    }
  });
});

describe('server-rendered pages keep block content out of <p>', () => {
  /* A <p> around a block element is split by the HTML parser: the select
   * demo's field rendered as an orphaned label, a sibling control, and a
   * stray empty paragraph. */
  const BLOCK =
    /<(address|article|aside|blockquote|details|dialog|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|menu|nav|ol|pre|section|table|ul)\b/;
  const SRC = new URL('../../packages/components/src/', import.meta.url);
  const slugs = readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.html`, SRC)))
    .map((d) => d.name);
  const pages = [
    ...siteRoutes
      .filter((route) => !route.path.includes(':'))
      .map((route) => [route.path, renderRoute(route, { tasks: [], hasApi: false })]),
    ...slugs.map((slug) => [`/components/${slug}`, renderComponentPage(slug)]),
  ];
  it('no route or component page renders a block element inside a paragraph', () => {
    for (const [path, html] of pages) {
      const route = { path };
      const scrubbed = html.replace(/<(script|style|template|textarea|code)\b[\s\S]*?<\/\1>/g, '');
      for (const m of scrubbed.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
        assert.doesNotMatch(m[1], BLOCK, `${route.path}: ${m[0].slice(0, 160)}`);
      }
    }
  });
});

describe('rendered surfaces leave their spacing to the container', () => {
  const css = readFileSync(repo('examples/express/public/styles.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  it('every component preview tray is the figure’s last child and the sheet zeroes its margin', () => {
    const html = renderComponentPage('card');
    assert.match(
      html,
      /<figure[^>]*data-bn-component-preview[^>]*>[\s\S]*?<output[\s\S]*?<\/output>\s*<\/figure>/,
    );
    assert.match(css, /\[data-bn-component-preview\] \{\s*& > output \{[^}]*\bmargin:\s*0\b/);
  });
  it('catalog fieldsets carry a variant, so the site’s bare-fieldset spacing cannot reach them', () => {
    for (const slug of ['choice-group', 'radio']) {
      const html = renderComponentPage(slug);
      const sets = html.match(/<fieldset[^>]*>/g) || [];
      assert.ok(sets.length, `${slug} renders a fieldset`);
      for (const f of sets) assert.match(f, /\svariant="/, `${slug}: ${f}`);
    }
    assert.doesNotMatch(css, /(^|[\s,}])fieldset > label \+ label/m);
  });
});

describe('every custom property the site sheet reads is defined', () => {
  it('no var() without a fallback names a property nothing defines', () => {
    const site = readFileSync(repo('examples/express/public/styles.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const sources = [site, ...componentStylesheets().map((f) => readFileSync(f, 'utf8'))];
    const defined = new Set(
      sources.flatMap((s) => [...s.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])),
    );
    const unresolved = [
      ...new Set(
        [...site.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)]
          .filter((m) => !m[2] && !defined.has(m[1]))
          .map((m) => m[1]),
      ),
    ];
    /* An undefined var() makes the whole declaration invalid at computed
       time: a bare radio drew no ring (border and background fell to
       their initial values), a dialog no surface. */
    assert.deepEqual(unresolved, []);
  });
});

describe('form specimens share one field measure', () => {
  const css = () => readFileSync(repo('examples/express/public/styles.css'), 'utf8');

  it('defines --measure-field and caps every form specimen root at it', () => {
    const sheet = css();
    assert.match(sheet, /--measure-field:\s*28rem;/);
    const at = sheet.indexOf('max-inline-size: var(--measure-field)');
    assert.ok(at > 0, 'a preview rule reads --measure-field');
    const rule = sheet.slice(sheet.lastIndexOf('> output', at), at);
    for (const root of [
      "section[variant='field']",
      "section[variant='multiselect']",
      "section:has(> [role='combobox'])",
      'search',
      'form',
      'input:not(',
      'textarea',
    ]) {
      assert.ok(rule.includes(root), `${root} takes the field measure`);
    }
  });

  it('never nests :has() inside :has(), which drops the whole selector list', () => {
    const files = [
      'examples/express/public/styles.css',
      ...readdirSync(repo('packages/components/src'), { recursive: true })
        .filter((f) => String(f).endsWith('.css'))
        .map((f) => `packages/components/src/${f}`),
    ];
    const nested = [];
    for (const file of files) {
      const text = readFileSync(repo(file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      let i = text.indexOf(':has(');
      while (i !== -1) {
        let depth = 0;
        let j = i + 4;
        for (; j < text.length; j++) {
          if (text[j] === '(') depth++;
          else if (text[j] === ')' && --depth === 0) break;
        }
        const inner = text.slice(i + 5, j);
        if (inner.includes(':has(')) nested.push(`${file}: ${inner.slice(0, 60)}`);
        i = text.indexOf(':has(', j);
      }
    }
    assert.deepEqual(nested, []);
  });
});
