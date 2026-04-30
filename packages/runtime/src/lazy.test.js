import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLazyHydrator,
  lazyHydrate,
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMedia,
} from './lazy.js';

/* ---------- IntersectionObserver stub ---------- */

class MockIntersectionObserver {
  constructor(callback, options) {
    this._callback = callback;
    this._options = options;
    this._elements = new Set();
    MockIntersectionObserver._instances.push(this);
  }
  observe(el) { this._elements.add(el); }
  unobserve(el) { this._elements.delete(el); }
  disconnect() { this._elements.clear(); }

  /** Simulate entries becoming visible. */
  _trigger(entries) {
    this._callback(entries, this);
  }
}
MockIntersectionObserver._instances = [];

/* ---------- helpers ---------- */

function makeElement(tag = 'div') {
  const listeners = {};
  return {
    tagName: tag.toUpperCase(),
    addEventListener(evt, fn, _opts) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter((f) => f !== fn);
    },
    _fire(evt) {
      for (const fn of listeners[evt] || []) fn();
    },
    _listeners: listeners,
  };
}

/* ---------- setup / teardown ---------- */

let origIO;
let origRIC;
let origCIC;

beforeEach(() => {
  origIO = globalThis.IntersectionObserver;
  origRIC = globalThis.requestIdleCallback;
  origCIC = globalThis.cancelIdleCallback;
  MockIntersectionObserver._instances = [];
  globalThis.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = origIO;
  globalThis.requestIdleCallback = origRIC;
  globalThis.cancelIdleCallback = origCIC;
});

/* ---------- tests ---------- */

describe('createLazyHydrator', () => {
  it('returns a controller object with expected methods', () => {
    const h = createLazyHydrator();
    assert.equal(typeof h.observe, 'function');
    assert.equal(typeof h.disconnect, 'function');
    assert.equal(typeof h.hydrateNow, 'function');
    assert.equal(typeof h.getPending, 'function');
  });

  it('observe tracks elements as pending', () => {
    const h = createLazyHydrator();
    const el = makeElement();
    h.observe(el, () => {});
    assert.equal(h.getPending(), 1);
  });

  it('hydrates element when IntersectionObserver reports visible', () => {
    const h = createLazyHydrator();
    const el = makeElement();
    let called = false;
    h.observe(el, () => { called = true; });

    const io = MockIntersectionObserver._instances[0];
    io._trigger([{ target: el, isIntersecting: true }]);
    assert.equal(called, true);
    assert.equal(h.getPending(), 0);
  });

  it('does not double-hydrate an element', () => {
    const h = createLazyHydrator();
    const el = makeElement();
    let count = 0;
    h.observe(el, () => { count++; });

    const io = MockIntersectionObserver._instances[0];
    io._trigger([{ target: el, isIntersecting: true }]);
    io._trigger([{ target: el, isIntersecting: true }]);
    assert.equal(count, 1);
  });

  it('hydrateNow forces immediate hydration', () => {
    const h = createLazyHydrator();
    const el = makeElement();
    let called = false;
    h.observe(el, () => { called = true; });
    h.hydrateNow(el);
    assert.equal(called, true);
    assert.equal(h.getPending(), 0);
  });

  it('disconnect clears all pending observations', () => {
    const h = createLazyHydrator();
    h.observe(makeElement(), () => {});
    h.observe(makeElement(), () => {});
    assert.equal(h.getPending(), 2);
    h.disconnect();
    assert.equal(h.getPending(), 0);
  });

  it('falls back to immediate hydration when IntersectionObserver unavailable', () => {
    globalThis.IntersectionObserver = undefined;
    const h = createLazyHydrator();
    const el = makeElement();
    let called = false;
    h.observe(el, () => { called = true; });
    assert.equal(called, true);
    assert.equal(h.getPending(), 0);
  });
});

describe('lazyHydrate', () => {
  it('hydrates element via convenience wrapper', () => {
    const el = makeElement();
    let called = false;
    lazyHydrate(el, () => { called = true; });
    const io = MockIntersectionObserver._instances[0];
    io._trigger([{ target: el, isIntersecting: true }]);
    assert.equal(called, true);
  });
});

describe('hydrateOnIdle', () => {
  it('schedules callback via requestIdleCallback', () => {
    let captured = null;
    globalThis.requestIdleCallback = (fn) => { captured = fn; return 42; };
    globalThis.cancelIdleCallback = () => {};
    let called = false;
    hydrateOnIdle(() => { called = true; });
    assert.equal(typeof captured, 'function');
    captured();
    assert.equal(called, true);
  });

  it('falls back to setTimeout when requestIdleCallback missing', () => {
    globalThis.requestIdleCallback = undefined;
    // Shouldn't throw
    const cancel = hydrateOnIdle(() => {});
    assert.equal(typeof cancel, 'function');
    cancel(); // cancel the timeout
  });
});

describe('hydrateOnInteraction', () => {
  it('sets up event listeners on the element', () => {
    const el = makeElement();
    let _called = false;
    hydrateOnInteraction(el, () => { _called = true; });
    assert.ok(el._listeners['click']?.length > 0);
    assert.ok(el._listeners['focus']?.length > 0);
    assert.ok(el._listeners['mouseenter']?.length > 0);
  });

  it('hydrates on first interaction and cleans up', () => {
    const el = makeElement();
    let count = 0;
    hydrateOnInteraction(el, () => { count++; });
    el._fire('click');
    assert.equal(count, 1);
    // Second fire should not call again
    el._fire('click');
    assert.equal(count, 1);
  });

  it('accepts custom event list', () => {
    const el = makeElement();
    hydrateOnInteraction(el, () => {}, ['pointerdown']);
    assert.ok(el._listeners['pointerdown']?.length > 0);
    assert.equal(el._listeners['click'], undefined);
  });
});

describe('hydrateOnMedia', () => {
  it('hydrates immediately when media query already matches', () => {
    const origMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    });
    let called = false;
    hydrateOnMedia(() => { called = true; }, '(min-width: 768px)');
    assert.equal(called, true);
    globalThis.matchMedia = origMatchMedia;
  });

  it('hydrates when media query starts matching', () => {
    const origMatchMedia = globalThis.matchMedia;
    let changeHandler;
    const mql = {
      matches: false,
      addEventListener(evt, fn) { changeHandler = fn; },
      removeEventListener() {},
    };
    globalThis.matchMedia = () => mql;
    let called = false;
    hydrateOnMedia(() => { called = true; }, '(min-width: 768px)');
    assert.equal(called, false);
    mql.matches = true;
    changeHandler();
    assert.equal(called, true);
    globalThis.matchMedia = origMatchMedia;
  });
});

describe('lazyHydrate — additional', () => {
  it('returns the hydrator object', () => {
    const el = makeElement();
    const h = lazyHydrate(el, () => {});
    assert.equal(typeof h.observe, 'function');
    assert.equal(typeof h.disconnect, 'function');
  });

  it('hydrateNow on an element that was not observed is a no-op', () => {
    const h = createLazyHydrator();
    const el = makeElement();
    // hydrateNow for an unobserved element should not throw
    assert.doesNotThrow(() => h.hydrateNow(el));
  });
});

describe('hydrateOnInteraction — additional', () => {
  it('hydrates on focus event', () => {
    const el = makeElement();
    let called = false;
    hydrateOnInteraction(el, () => { called = true; });
    el._fire('focus');
    assert.equal(called, true);
  });

  it('hydrates on mouseenter event', () => {
    const el = makeElement();
    let called = false;
    hydrateOnInteraction(el, () => { called = true; });
    el._fire('mouseenter');
    assert.equal(called, true);
  });
});

describe('hydrateOnMedia — additional', () => {
  it('immediately hydrates when query matches at call time (variant)', () => {
    const origMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    });
    let count = 0;
    hydrateOnMedia(() => { count++; }, '(prefers-color-scheme: dark)');
    assert.equal(count, 1);
    globalThis.matchMedia = origMatchMedia;
  });
});
