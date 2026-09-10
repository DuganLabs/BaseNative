/**
 * Tests for the `@t` template directive (directive.js).
 *
 * Importing `./index.js` (or `./directive.js` directly) registers `@t` with
 * @basenative/runtime's directive registry as a side effect — see directive.js for
 * why (runtime/server must not import @basenative/i18n directly).
 *
 * The server-side dispatch path (render() emitting translated text) is exercised
 * end to end in packages/server/src/directives.test.js, since exercising it here
 * would need @basenative/server as a dependency of @basenative/i18n, which
 * @basenative/i18n does not otherwise need. This file instead:
 *   - Unit-tests the directive's own resolution logic directly through the registry.
 *   - Unit-tests the locale-change reactivity shim (getLocaleTick) with a plain
 *     @basenative/runtime effect(), with no DOM involved.
 *   - Exercises the client hydrate() path against a real DOM, reusing the happy-dom
 *     setup from @basenative/runtime's hydrate.test.js (see the note left there).
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { getDirective } from '@basenative/runtime/shared/directives';
import { effect } from '@basenative/runtime';
import { createI18n } from './index.js';

describe('@t directive registration', () => {
  it('registers itself as an "on: element" directive named "t"', () => {
    const directive = getDirective('t');
    assert.equal(directive.on, 'element');
    assert.equal(typeof directive.server, 'function');
    assert.equal(typeof directive.client, 'function');
  });
});

describe('@t directive resolution (server and client handlers)', () => {
  const { server, client } = getDirective('t');

  it('server handler translates the key using $i18n', () => {
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: { greeting: 'Hi {name}' } } });
    assert.equal(server('greeting', { $i18n: i18n, name: 'Ada' }, {}), 'Hi Ada');
  });

  it('client handler translates the key the same way', () => {
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: { greeting: 'Hi {name}' } } });
    assert.equal(client('greeting', { $i18n: i18n, name: 'Ada' }, {}), 'Hi Ada');
  });

  it('falls back to the key itself when the message is missing', () => {
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: {} } });
    assert.equal(server('missing.key', { $i18n: i18n }, {}), 'missing.key');
  });

  it('returns undefined and emits BN_T_NO_PROVIDER when $i18n is missing', () => {
    const diagnostics = [];
    const result = server('greeting', {}, { onDiagnostic: (d) => diagnostics.push(d) });
    assert.equal(result, undefined);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, 'BN_T_NO_PROVIDER');
    assert.match(diagnostics[0].message, /greeting/);
  });

  it('returns undefined when $i18n has no t() function', () => {
    const diagnostics = [];
    const result = server('greeting', { $i18n: {} }, { onDiagnostic: (d) => diagnostics.push(d) });
    assert.equal(result, undefined);
    assert.equal(diagnostics[0].code, 'BN_T_NO_PROVIDER');
  });
});

describe('@t directive — locale-change reactivity (no DOM)', () => {
  it('reruns an effect() that reads the client handler when the locale changes', () => {
    const { client } = getDirective('t');
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { greeting: 'Hello!' }, fr: { greeting: 'Bonjour!' } },
    });

    const seen = [];
    const runner = effect(() => {
      seen.push(client('greeting', { $i18n: i18n }, {}));
    });

    assert.deepEqual(seen, ['Hello!']);
    i18n.setLocale('fr');
    assert.deepEqual(seen, ['Hello!', 'Bonjour!']);
    runner.dispose();
  });
});

describe('@t directive — client hydrate() path', () => {
  let window, document;

  beforeEach(() => {
    window = new Window({ url: 'http://localhost' });
    document = window.document;
    globalThis.document = document;
    globalThis.window = window;
    globalThis.Node = window.Node;
  });

  afterEach(async () => {
    try {
      document?.activeElement?.blur?.();
    } catch {}
    await window?.happyDOM?.abort?.();
    await window?.happyDOM?.close?.();
  });

  it('sets text content to the translated message, interpolating from context', async () => {
    const { hydrate } = await import('@basenative/runtime');
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: { greeting: 'Hello, {name}!' } } });

    const root = document.createElement('section');
    root.innerHTML = `<h1 @t="greeting">fallback</h1>`;
    document.body.append(root);

    hydrate(root, { $i18n: i18n, name: 'Ada' });
    assert.equal(root.querySelector('h1').textContent, 'Hello, Ada!');
  });

  it('re-renders when the locale changes', async () => {
    const { hydrate } = await import('@basenative/runtime');
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { greeting: 'Hello!' }, fr: { greeting: 'Bonjour!' } },
    });

    const root = document.createElement('section');
    root.innerHTML = `<h1 @t="greeting">fallback</h1>`;
    document.body.append(root);

    hydrate(root, { $i18n: i18n });
    assert.equal(root.querySelector('h1').textContent, 'Hello!');

    i18n.setLocale('fr');
    assert.equal(root.querySelector('h1').textContent, 'Bonjour!');
  });

  it('leaves existing content untouched and emits a diagnostic when $i18n is missing', async () => {
    const { hydrate } = await import('@basenative/runtime');

    const root = document.createElement('section');
    root.innerHTML = `<h1 @t="greeting">Static fallback</h1>`;
    document.body.append(root);

    const diagnostics = [];
    hydrate(root, {}, { onDiagnostic: (d) => diagnostics.push(d) });

    assert.equal(root.querySelector('h1').textContent, 'Static fallback');
    assert.ok(diagnostics.some((d) => d.code === 'BN_T_NO_PROVIDER'));
  });
});
