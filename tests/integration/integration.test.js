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
