import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { signal, computed, effect } from './signals.js';
import {
  enableDevtools,
  disableDevtools,
  isDevtoolsEnabled,
  trackSignal,
  trackEffect,
} from './devtools.js';

const hook = () => globalThis.__BASENATIVE_DEVTOOLS__;

beforeEach(() => {
  disableDevtools();
});

afterEach(() => {
  disableDevtools();
});

describe('devtools hook lifecycle', () => {
  it('is off by default and installs no global', () => {
    assert.equal(isDevtoolsEnabled(), false);
    assert.equal(hook(), undefined);
    // Creation while disabled is silent and untracked.
    signal(0);
    assert.equal(hook(), undefined);
  });

  it('enable installs the hook; disable removes it and clears state', () => {
    enableDevtools();
    assert.equal(isDevtoolsEnabled(), true);
    for (const key of ['getSignals', 'getEffects', 'getHydrations', 'getState']) {
      assert.equal(typeof hook()[key], 'function', key);
    }
    signal(1);
    assert.equal(hook().getSignals().length, 1);
    disableDevtools();
    assert.equal(hook(), undefined);
    enableDevtools();
    assert.equal(hook().getSignals().length, 0);
  });
});

describe('automatic registration', () => {
  it('registers signals on creation, with live values', () => {
    enableDevtools();
    const a = signal(1);
    signal('x');
    assert.equal(hook().getSignals().length, 2);
    assert.equal(hook().getState().signalCount, 2);
    a.set(2);
    const entry = hook().getSignals().find((e) => e.id === trackSignal(a));
    assert.equal(entry.value, 2);
  });

  it('does not retroactively track signals created before enabling', () => {
    signal(0);
    enableDevtools();
    assert.equal(hook().getSignals().length, 0);
    signal(1);
    assert.equal(hook().getSignals().length, 1);
  });

  it('reports live subscriber counts', () => {
    enableDevtools();
    const s = signal(0);
    const entry = () => hook().getSignals().find((e) => e.id === trackSignal(s));
    assert.equal(entry().subscriberCount, 0);
    effect(() => {
      s();
    });
    assert.equal(entry().subscriberCount, 1);
    effect(() => {
      s();
    });
    assert.equal(entry().subscriberCount, 2);
  });

  it('registers a computed as a signal holding its derived value', () => {
    enableDevtools();
    const s = signal(2);
    computed(() => s() * 3);
    const values = hook()
      .getSignals()
      .map((e) => e.value)
      .sort((x, y) => x - y);
    assert.deepEqual(values, [2, 6]);
    s.set(3);
    const after = hook()
      .getSignals()
      .map((e) => e.value)
      .sort((x, y) => x - y);
    assert.deepEqual(after, [3, 9]);
  });

  it('registers effects on creation and reports disposal', () => {
    enableDevtools();
    const stop = effect(() => {});
    const id = trackEffect(stop);
    const entry = () => hook().getEffects().find((e) => e.id === id);
    assert.equal(entry().disposed, false);
    stop.dispose();
    assert.equal(entry().disposed, true);
  });

  it('a manual trackSignal call relabels instead of duplicating', () => {
    enableDevtools();
    const s = signal(0);
    const id = trackSignal(s, 'count');
    assert.equal(hook().getSignals().length, 1);
    const entry = hook().getSignals()[0];
    assert.equal(entry.id, id);
    assert.equal(entry.label, 'count');
  });
});

describe('hydration timeline', () => {
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

  it('records a hydration event when hydrate() runs', async () => {
    const { hydrate } = await import('./hydrate.js');
    enableDevtools();
    const root = document.createElement('section');
    root.innerHTML = `
      <template @if="show()">
        <p>Visible</p>
      </template>
      <template @else>
        <p>Hidden</p>
      </template>
    `;
    document.body.append(root);

    hydrate(root, { show: signal(true) });

    const events = hook().getHydrations();
    assert.equal(events.length, 1);
    assert.equal(events[0].root, 'SECTION');
    assert.ok(events[0].directivesProcessed >= 1);
    assert.equal(typeof events[0].timestamp, 'number');
  });

  it('records nothing while disabled', async () => {
    const { hydrate } = await import('./hydrate.js');
    const root = document.createElement('section');
    root.innerHTML = `<p>{{ msg() }}</p>`;
    document.body.append(root);

    hydrate(root, { msg: signal('hi') });

    assert.equal(hook(), undefined);
  });
});
