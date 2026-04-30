import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { definePlugin, createPluginRegistry } from './plugins.js';

describe('definePlugin', () => {
  it('returns a plugin object with name and setup', () => {
    const setup = () => {};
    const plugin = definePlugin({ name: 'test-plugin', setup });
    assert.equal(plugin.name, 'test-plugin');
    assert.equal(plugin.setup, setup);
  });

  it('provides a default no-op setup when omitted', () => {
    const plugin = definePlugin({ name: 'no-setup' });
    assert.equal(plugin.name, 'no-setup');
    assert.equal(typeof plugin.setup, 'function');
  });

  it('throws when name is missing', () => {
    assert.throws(() => definePlugin({}), /non-empty "name"/);
    assert.throws(() => definePlugin({ name: '' }), /non-empty "name"/);
  });
});

describe('createPluginRegistry', () => {
  it('register adds plugin to registry', () => {
    const registry = createPluginRegistry();
    const plugin = definePlugin({ name: 'alpha', setup() {} });
    registry.register(plugin);
    assert.deepStrictEqual(registry.getPlugins(), ['alpha']);
  });

  it('setup is called on register', () => {
    const registry = createPluginRegistry();
    let called = false;
    const plugin = definePlugin({
      name: 'setup-check',
      setup() {
        called = true;
      },
    });
    registry.register(plugin);
    assert.equal(called, true);
  });

  it('lifecycle hooks fire in registration order', () => {
    const registry = createPluginRegistry();
    const order = [];

    registry.register(
      definePlugin({
        name: 'first',
        setup(api) {
          api.onBeforeRender(() => order.push('first'));
        },
      }),
    );

    registry.register(
      definePlugin({
        name: 'second',
        setup(api) {
          api.onBeforeRender(() => order.push('second'));
        },
      }),
    );

    registry.runHook('beforeRender');
    assert.deepStrictEqual(order, ['first', 'second']);
  });

  it('hooks receive arguments', () => {
    const registry = createPluginRegistry();
    let received;
    registry.register(
      definePlugin({
        name: 'args-check',
        setup(api) {
          api.onError((...args) => {
            received = args;
          });
        },
      }),
    );

    registry.runHook('error', 'some-error', { detail: 42 });
    assert.deepStrictEqual(received, ['some-error', { detail: 42 }]);
  });

  it('custom directives can be registered and retrieved', () => {
    const registry = createPluginRegistry();
    const handler = (_el, _value) => {};

    registry.register(
      definePlugin({
        name: 'directive-plugin',
        setup(api) {
          api.addDirective('tooltip', handler);
        },
      }),
    );

    assert.equal(registry.getDirective('tooltip'), handler);
    assert.equal(registry.getDirective('nonexistent'), undefined);
  });

  it('duplicate plugin names throw', () => {
    const registry = createPluginRegistry();
    const plugin = definePlugin({ name: 'dup', setup() {} });
    registry.register(plugin);
    assert.throws(() => registry.register(plugin), /already registered/);
  });

  it('runHook with no hooks is a no-op', () => {
    const registry = createPluginRegistry();
    // Should not throw
    registry.runHook('beforeRender');
    registry.runHook('afterHydrate', { data: 1 });
  });

  it('all five lifecycle hooks fire correctly', () => {
    const registry = createPluginRegistry();
    const fired = [];
    registry.register(definePlugin({
      name: 'all-hooks',
      setup(api) {
        api.onBeforeRender(() => fired.push('beforeRender'));
        api.onAfterRender(() => fired.push('afterRender'));
        api.onBeforeHydrate(() => fired.push('beforeHydrate'));
        api.onAfterHydrate(() => fired.push('afterHydrate'));
        api.onError(() => fired.push('error'));
      },
    }));
    for (const hook of ['beforeRender', 'afterRender', 'beforeHydrate', 'afterHydrate', 'error']) {
      registry.runHook(hook);
    }
    assert.deepStrictEqual(fired, ['beforeRender', 'afterRender', 'beforeHydrate', 'afterHydrate', 'error']);
  });

  it('invalid directive name throws', () => {
    const registry = createPluginRegistry();
    assert.throws(() => {
      registry.register(definePlugin({
        name: 'bad-dir',
        setup(api) { api.addDirective('', () => {}); },
      }));
    }, /non-empty string/);
  });

  it('invalid directive handler throws', () => {
    const registry = createPluginRegistry();
    assert.throws(() => {
      registry.register(definePlugin({
        name: 'bad-handler',
        setup(api) { api.addDirective('my-dir', 'not-a-function'); },
      }));
    }, /must be a function/);
  });

  it('multiple plugins can each register the same hook', () => {
    const registry = createPluginRegistry();
    const calls = [];
    registry.register(definePlugin({ name: 'p1', setup(api) { api.onAfterRender(() => calls.push('p1')); } }));
    registry.register(definePlugin({ name: 'p2', setup(api) { api.onAfterRender(() => calls.push('p2')); } }));
    registry.runHook('afterRender');
    assert.deepStrictEqual(calls, ['p1', 'p2']);
  });

  it('getPlugins returns all registered plugin names', () => {
    const registry = createPluginRegistry();
    registry.register(definePlugin({ name: 'a', setup() {} }));
    registry.register(definePlugin({ name: 'b', setup() {} }));
    assert.deepStrictEqual(registry.getPlugins(), ['a', 'b']);
  });
});
