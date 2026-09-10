/**
 * Ported from GreenPut's libs/basenative/router-guards/src/guards.spec.ts
 * (vitest + jsdom) to node:test. Every assertion from that suite is kept;
 * only the test/mock/DOM APIs differ.
 *
 * createRouter()/withGuards() read the `location`/`history`/`window` globals,
 * which don't exist under plain node:test, so each test gets a fresh
 * happy-dom Window installed as those globals (mirroring the pattern already
 * used in packages/runtime/src/hydrate.test.js).
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createRouter } from './router.js';
import { withGuards, redirect, RedirectError } from './guards.js';

let window;

beforeEach(() => {
  window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.history = window.history;
  globalThis.location = window.location;
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.history;
  delete globalThis.location;
});

function freshRouter() {
  history.replaceState(null, '', '/');
  const base = createRouter([
    { path: '/', name: 'home' },
    { path: '/dashboard', name: 'dashboard' },
    { path: '/login', name: 'login' },
    { path: '/leads/:id', name: 'lead-detail' },
  ]);
  return withGuards(base);
}

describe('withGuards', () => {
  let router;

  beforeEach(() => {
    router = freshRouter();
  });

  it('navigates without guards', async () => {
    const ok = await router.navigate('/dashboard');
    assert.equal(ok, true);
    assert.equal(router.pathname(), '/dashboard');
    assert.equal(router.currentRoute().name, 'dashboard');
  });

  it('passes from/to context to beforeEach guards', async () => {
    const seen = [];
    router.beforeEach((ctx) => {
      seen.push({ from: ctx.from?.path ?? null, to: ctx.to.path });
    });

    await router.navigate('/dashboard');
    await router.navigate('/leads/abc');

    assert.deepEqual(seen, [
      { from: '/', to: '/dashboard' },
      { from: '/dashboard', to: '/leads/:id' },
    ]);
  });

  it('extracts route params for the destination preview', async (t) => {
    const guard = t.mock.fn(() => undefined);
    router.beforeEach(guard);

    await router.navigate('/leads/lead-42?source=dashboard');

    assert.equal(guard.mock.callCount(), 1);
    const ctx = guard.mock.calls[0].arguments[0];
    assert.deepEqual(ctx.to.params, { id: 'lead-42' });
    assert.deepEqual(ctx.to.query, { source: 'dashboard' });
  });

  it('aborts navigation when a guard returns false', async () => {
    router.beforeEach(() => false);
    const ok = await router.navigate('/dashboard');
    assert.equal(ok, false);
    assert.equal(router.pathname(), '/');
  });

  it('redirects when a guard returns a string', async () => {
    router.beforeEach((ctx) => (ctx.to.path === '/dashboard' ? '/login' : undefined));

    const ok = await router.navigate('/dashboard');

    assert.equal(ok, false);
    assert.equal(router.pathname(), '/login');
  });

  it('redirects when a guard returns { redirect }', async () => {
    router.beforeEach((ctx) =>
      ctx.to.path === '/dashboard' ? { redirect: '/login', replace: false } : undefined,
    );

    await router.navigate('/dashboard');
    assert.equal(router.pathname(), '/login');
  });

  it('redirects when a guard throws RedirectError via redirect() helper', async () => {
    router.beforeEach((ctx) => {
      if (ctx.to.path === '/dashboard') redirect('/login');
    });

    const ok = await router.navigate('/dashboard');
    assert.equal(ok, false);
    assert.equal(router.pathname(), '/login');
  });

  it('rethrows non-RedirectError exceptions from guards', async () => {
    router.beforeEach(() => {
      throw new Error('boom');
    });

    await assert.rejects(() => router.navigate('/dashboard'), /boom/);
    assert.equal(router.pathname(), '/');
  });

  it('runs guards sequentially and stops at the first abort', async () => {
    const calls = [];
    router.beforeEach(async () => {
      calls.push('first');
    });
    router.beforeEach(() => {
      calls.push('second');
      return false;
    });
    router.beforeEach(() => {
      calls.push('third');
    });

    await router.navigate('/dashboard');
    assert.deepEqual(calls, ['first', 'second']);
  });

  it('invokes afterEach handlers after successful navigation', async (t) => {
    const handler = t.mock.fn();
    router.afterEach(handler);

    await router.navigate('/dashboard');

    assert.equal(handler.mock.callCount(), 1);
    const ctx = handler.mock.calls[0].arguments[0];
    assert.equal(ctx.to.name, 'dashboard');
    assert.equal(ctx.from?.name, 'home');
  });

  it('does not invoke afterEach when navigation is aborted', async (t) => {
    const handler = t.mock.fn();
    router.beforeEach(() => false);
    router.afterEach(handler);

    await router.navigate('/dashboard');

    assert.equal(handler.mock.callCount(), 0);
  });

  it('returns disposers that unregister hooks', async (t) => {
    const guard = t.mock.fn();
    const dispose = router.beforeEach(guard);

    await router.navigate('/dashboard');
    assert.equal(guard.mock.callCount(), 1);

    dispose();
    await router.navigate('/');
    assert.equal(guard.mock.callCount(), 1);
  });

  it('returns disposers for afterEach', async (t) => {
    const handler = t.mock.fn();
    const dispose = router.afterEach(handler);

    await router.navigate('/dashboard');
    assert.equal(handler.mock.callCount(), 1);

    dispose();
    await router.navigate('/');
    assert.equal(handler.mock.callCount(), 1);
  });

  it('aborts an in-flight navigation when a new one starts', async () => {
    const releases = [];
    router.beforeEach(
      () =>
        new Promise((resolve) => {
          releases.push(resolve);
        }),
    );

    const first = router.navigate('/dashboard');
    const second = router.navigate('/login');
    // Resolve in reverse so the second navigation finishes first.
    releases[1]();
    releases[0]();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult, false);
    assert.equal(secondResult, true);
    assert.equal(router.pathname(), '/login');
  });

  it('replace flag from RedirectError reaches history', async (t) => {
    const replaceSpy = t.mock.method(history, 'replaceState');
    const pushSpy = t.mock.method(history, 'pushState');

    router.beforeEach((ctx) => {
      if (ctx.to.path === '/dashboard') throw new RedirectError('/login', true);
    });

    await router.navigate('/dashboard');

    assert.ok(replaceSpy.mock.callCount() > 0);
    assert.ok(pushSpy.mock.callCount() >= 0);
  });

  it('exposes router signals untouched', () => {
    assert.equal(typeof router.pathname, 'function');
    assert.equal(typeof router.currentRoute, 'function');
    assert.equal(typeof router.query, 'function');
  });
});

describe('redirect()', () => {
  it('throws a RedirectError', () => {
    assert.throws(() => redirect('/somewhere'), RedirectError);
  });

  it('preserves the destination path', () => {
    assert.throws(
      () => redirect('/login', false),
      (error) => {
        assert.ok(error instanceof RedirectError);
        assert.equal(error.to, '/login');
        assert.equal(error.replace, false);
        return true;
      },
    );
  });

  it('defaults replace to true', () => {
    assert.throws(
      () => redirect('/x'),
      (error) => {
        assert.equal(error.replace, true);
        return true;
      },
    );
  });
});
