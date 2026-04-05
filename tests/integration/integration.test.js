/**
 * Cross-package integration tests for BaseNative.
 * These tests verify that packages work correctly together.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── 1. Server + Runtime: SSR → Context Setup ────────────────────────────────

describe('SSR → Context Pipeline', () => {
  it('server renders a template with context and produces expected HTML', async () => {
    const { render } = await import('@basenative/server');
    const html = render('<h1>{{ title }}</h1><p>{{ message }}</p>', {
      title: 'BaseNative',
      message: 'Hello from SSR',
    });
    assert.ok(html.includes('<h1>BaseNative</h1>'));
    assert.ok(html.includes('<p>Hello from SSR</p>'));
  });

  it('server renders @for with items and runtime signals can replicate the same values', async () => {
    const { render } = await import('@basenative/server');
    const { signal } = await import('@basenative/runtime');

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

    // Runtime signal holds the same data
    const itemsSignal = signal(items);
    assert.deepEqual(itemsSignal(), items);
  });

  it('server renders @if conditional based on context value', async () => {
    const { render } = await import('@basenative/server');

    const withTrue = render(
      '<template @if="show"><span>visible</span></template><template @else><span>hidden</span></template>',
      { show: true },
    );
    const withFalse = render(
      '<template @if="show"><span>visible</span></template><template @else><span>hidden</span></template>',
      { show: false },
    );

    assert.ok(withTrue.includes('<span>visible</span>'));
    assert.ok(!withTrue.includes('<span>hidden</span>'));
    assert.ok(withFalse.includes('<span>hidden</span>'));
    assert.ok(!withFalse.includes('<span>visible</span>'));
  });
});

// ─── 2. Router + Server: SSR-Aware Route Matching ────────────────────────────

describe('Router + Server Integration', () => {
  it('router resolves a route and server renders the matched page', async () => {
    const { compilePattern, matchRoute } = await import('@basenative/router');
    const { render } = await import('@basenative/server');

    const routes = [
      { path: '/', template: '<h1>Home</h1>' },
      { path: '/about', template: '<h1>About</h1>' },
      { path: '/users/:id', template: '<h1>User {{ params.id }}</h1>' },
    ];

    const compiled = routes.map((r) => ({ ...r, compiled: compilePattern(r.path) }));

    function resolveAndRender(pathname) {
      for (const route of compiled) {
        const params = matchRoute(route.compiled, pathname);
        if (params !== null) {
          return render(route.template, { params });
        }
      }
      return render('<h1>404</h1>', {});
    }

    assert.ok(resolveAndRender('/').includes('<h1>Home</h1>'));
    assert.ok(resolveAndRender('/about').includes('<h1>About</h1>'));
    assert.ok(resolveAndRender('/users/42').includes('<h1>User 42</h1>'));
    assert.ok(resolveAndRender('/unknown').includes('<h1>404</h1>'));
  });

  it('router extracts params correctly for nested paths', async () => {
    const { compilePattern, matchRoute } = await import('@basenative/router');

    const pattern = compilePattern('/users/:userId/posts/:postId');
    const params = matchRoute(pattern, '/users/99/posts/123');

    assert.deepEqual(params, { userId: '99', postId: '123' });
  });
});

// ─── 3. Forms + Validators: Form State Integration ───────────────────────────

describe('Forms + Validators Integration', () => {
  it('form validates with multiple built-in validators', async () => {
    const { createForm, createField, required, minLength, email } = await import('@basenative/forms');

    const nameField = createField('', { validators: [required(), minLength(2)] });
    const emailField = createField('', { validators: [required(), email()] });

    const form = createForm({ name: nameField, email: emailField });

    // Initially invalid (empty)
    assert.equal(form.valid(), false);

    // Set valid values
    nameField.setValue('Alice');
    emailField.setValue('alice@example.com');
    assert.equal(form.valid(), true);
  });

  it('form tracks dirty state correctly', async () => {
    const { createField } = await import('@basenative/forms');

    const field = createField('original');
    assert.equal(field.dirty(), false);

    field.setValue('changed');
    assert.equal(field.dirty(), true);

    field.reset();
    assert.equal(field.dirty(), false);
  });
});

// ─── 4. Config + Logger: Application Configuration ───────────────────────────

describe('Config + Logger Integration', () => {
  it('config loads from env and logger uses the level from config', async () => {
    const { defineConfig, string, optional } = await import('@basenative/config');
    const { createLogger } = await import('@basenative/logger');

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
    assert.ok(logger);
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.debug, 'function');
    assert.equal(typeof logger.warn, 'function');
    assert.equal(typeof logger.error, 'function');

    logger.info('test message');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].msg, 'test message');
  });

  it('config applies defaults for missing env vars', async () => {
    const { defineConfig, string, optional } = await import('@basenative/config');

    const config = defineConfig({
      schema: {
        PORT: optional(string(), '3000'),
        HOST: optional(string(), 'localhost'),
      },
      env: {},
    });

    assert.equal(config.PORT, '3000');
    assert.equal(config.HOST, 'localhost');
  });
});

// ─── 5. Signals: Reactive Computation Chain ───────────────────────────────────

describe('Runtime Signal Composition', () => {
  it('computed chains update correctly through multiple layers', async () => {
    const { signal, computed } = await import('@basenative/runtime');

    const price = signal(10);
    const quantity = signal(3);
    const subtotal = computed(() => price() * quantity());
    const tax = computed(() => subtotal() * 0.1);
    const total = computed(() => subtotal() + tax());

    assert.equal(subtotal(), 30);
    assert.equal(tax(), 3);
    assert.equal(total(), 33);

    price.set(20);
    assert.equal(subtotal(), 60);
    assert.equal(tax(), 6);
    assert.equal(total(), 66);
  });

  it('effect runs when dependencies change', async () => {
    const { signal, effect } = await import('@basenative/runtime');

    const count = signal(0);
    const log = [];
    const fx = effect(() => { log.push(count()); });

    assert.deepEqual(log, [0]);
    count.set(1);
    assert.deepEqual(log, [0, 1]);
    count.set(2);
    assert.deepEqual(log, [0, 1, 2]);
    fx.dispose();
    count.set(3);
    assert.deepEqual(log, [0, 1, 2]); // disposed, no more updates
  });
});

// ─── 6. Server + Flags: Feature-Flagged Rendering ─────────────────────────────

describe('Server + Flags: Feature-Flagged SSR', () => {
  it('flags evaluate correctly and gate server-rendered content', async () => {
    const { createFlagManager, createMemoryProvider } = await import('@basenative/flags');
    const { render } = await import('@basenative/server');

    const provider = createMemoryProvider({
      'new-ui': { enabled: false },
    });
    const flags = createFlagManager(provider, { defaultValue: false });

    const userCtx = { userId: 'user-123' };
    const isEnabled = await flags.isEnabled('new-ui', userCtx);

    const html = render(
      '<template @if="showNewUI"><div class="new">New UI</div></template><template @else><div class="old">Old UI</div></template>',
      { showNewUI: isEnabled },
    );

    // Flag is off by default, old UI should render
    assert.ok(html.includes('Old UI'));
    assert.ok(!html.includes('New UI'));
  });
});

// ─── 7. Server + I18n: Internationalized SSR ──────────────────────────────────

describe('Server + I18n: Internationalized Rendering', () => {
  it('i18n translates messages and server renders them correctly', async () => {
    const { createI18n } = await import('@basenative/i18n');
    const { render } = await import('@basenative/server');

    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { greeting: 'Hello, {name}!', farewell: 'Goodbye!' },
        es: { greeting: '¡Hola, {name}!', farewell: '¡Adiós!' },
      },
    });

    const t = (...args) => i18n.t(...args);

    // English
    const enHtml = render('<p>{{ greeting }}</p>', {
      greeting: t('greeting', { name: 'Alice' }),
    });
    assert.ok(enHtml.includes('<p>Hello, Alice!</p>'));
  });
});

// ─── 8. Server + Logger: Request Logging Integration ──────────────────────────

describe('Server + Logger: Request Context', () => {
  it('logger creates child with request context for each render', async () => {
    const { createLogger } = await import('@basenative/logger');
    const { render } = await import('@basenative/server');

    const logs = [];
    const logger = createLogger({
      level: 'info',
      transport: { write: (entry) => { logs.push(entry); } },
    });

    // Simulate a request handler with per-request logger
    function handleRequest(reqId, template, ctx) {
      const reqLogger = logger.child({ requestId: reqId });
      reqLogger.info('rendering page');
      const html = render(template, ctx);
      reqLogger.info('render complete', { htmlLength: html.length });
      return html;
    }

    const html = handleRequest('req-1', '<h1>{{ title }}</h1>', { title: 'Test' });
    assert.ok(html.includes('<h1>Test</h1>'));
    assert.ok(logs.length >= 2);
    assert.ok(logs.every((l) => l.requestId === 'req-1'));
  });
});
