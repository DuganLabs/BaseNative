/**
 * Tests for the `@feature` template directive (directive.js).
 *
 * Importing `./index.js` (or `./directive.js` directly) registers `@feature` with
 * @basenative/runtime's directive registry as a side effect — see directive.js for
 * why (runtime/server must not import @basenative/flags directly).
 *
 * The server-side dispatch path (render() with @feature on/off and @else) is
 * exercised end to end in packages/server/src/directives.test.js, since exercising
 * it here would need @basenative/server as a dependency of @basenative/flags, which
 * @basenative/flags does not otherwise need. This file instead:
 *   - Unit-tests the directive's own resolution logic directly through the registry.
 *   - Exercises the client hydrate() path against a real DOM, reusing the happy-dom
 *     setup from @basenative/runtime's hydrate.test.js (see the note left there).
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { getDirective } from '@basenative/runtime/shared/directives';
import { createFlagManager, createFlagContext } from './index.js';
import { createMemoryProvider } from './providers/memory.js';

describe('@feature directive registration', () => {
  it('registers itself as an "on: template" directive named "feature"', () => {
    const directive = getDirective('feature');
    assert.equal(directive.on, 'template');
    assert.equal(typeof directive.server, 'function');
    assert.equal(typeof directive.client, 'function');
  });
});

describe('createFlagContext', () => {
  it('resolves every flag once into a synchronous isEnabled(name)', async () => {
    const flags = createFlagManager(createMemoryProvider({
      on: { enabled: true },
      off: { enabled: false },
    }));
    const $flags = await createFlagContext(flags);

    assert.equal($flags.isEnabled('on'), true);
    assert.equal($flags.isEnabled('off'), false);
    assert.equal($flags.isEnabled('unknown'), false);
    assert.deepEqual($flags.flags, { on: true, off: false });
  });

  it('forwards the evaluation context to the flag manager (percentage/rules)', async () => {
    const flags = createFlagManager(createMemoryProvider({
      adminOnly: { rules: [{ roles: ['admin'], value: true }] },
    }));
    const $flagsAdmin = await createFlagContext(flags, { role: 'admin' });
    const $flagsUser = await createFlagContext(flags, { role: 'user' });

    assert.equal($flagsAdmin.isEnabled('adminOnly'), true);
    assert.equal($flagsUser.isEnabled('adminOnly'), false);
  });
});

describe('@feature directive resolution (server and client handlers)', () => {
  const { server, client } = getDirective('feature');

  it('server handler returns the synchronous $flags.isEnabled(name) result', () => {
    assert.equal(server('beta', { $flags: { isEnabled: () => true } }, {}), true);
    assert.equal(server('beta', { $flags: { isEnabled: () => false } }, {}), false);
  });

  it('client handler behaves the same as the server handler', () => {
    assert.equal(client('beta', { $flags: { isEnabled: () => true } }, {}), true);
  });

  it('treats a missing $flags as disabled and emits BN_FEATURE_NO_PROVIDER', () => {
    const diagnostics = [];
    const options = { onDiagnostic: (d) => diagnostics.push(d) };

    assert.equal(server('beta', {}, options), false);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, 'BN_FEATURE_NO_PROVIDER');
    assert.match(diagnostics[0].message, /beta/);
  });

  it('treats a $flags without isEnabled() as disabled and emits a diagnostic', () => {
    const diagnostics = [];
    assert.equal(server('beta', { $flags: {} }, { onDiagnostic: (d) => diagnostics.push(d) }), false);
    assert.equal(diagnostics[0].code, 'BN_FEATURE_NO_PROVIDER');
  });
});

describe('@feature directive — client hydrate() path', () => {
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

  it('hydrates the feature branch when the flag is enabled, and reacts to @else', async () => {
    const { hydrate } = await import('@basenative/runtime');

    const root = document.createElement('section');
    root.innerHTML = `
      <template @feature="beta"><p>Beta UI</p></template>
      <template @else><p>Classic UI</p></template>
    `;
    document.body.append(root);

    hydrate(root, { $flags: { isEnabled: (name) => name === 'beta' } });
    assert.ok(root.textContent.includes('Beta UI'));
    assert.ok(!root.textContent.includes('Classic UI'));
  });

  it('hydrates the @else branch when the flag is disabled', async () => {
    const { hydrate } = await import('@basenative/runtime');

    const root = document.createElement('section');
    root.innerHTML = `
      <template @feature="beta"><p>Beta UI</p></template>
      <template @else><p>Classic UI</p></template>
    `;
    document.body.append(root);

    hydrate(root, { $flags: { isEnabled: () => false } });
    assert.ok(root.textContent.includes('Classic UI'));
    assert.ok(!root.textContent.includes('Beta UI'));
  });

  it('a <div @feature="x"> not on a <template> stays an event listener (unaffected)', async () => {
    const { hydrate } = await import('@basenative/runtime');

    const root = document.createElement('section');
    root.innerHTML = `<div @feature="beta">Always here</div>`;
    document.body.append(root);

    hydrate(root, { $flags: { isEnabled: () => false } });
    assert.ok(root.textContent.includes('Always here'));
    // Treated as a DOM event listener named "feature", same as any other @name on a
    // non-template element — the attribute is stripped exactly like @click would be.
    assert.equal(root.querySelector('div').getAttribute('@feature'), null);
  });
});
