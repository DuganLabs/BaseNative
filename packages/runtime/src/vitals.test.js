import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVitalsReporter,
  observeLCP,
  observeFID,
  observeCLS,
  observeFCP,
  observeTTFB,
  observeINP,
} from './vitals.js';

/* ---------- PerformanceObserver stub ---------- */

let observerInstances;

class MockPerformanceObserver {
  constructor(callback) {
    this._callback = callback;
    this._type = null;
    observerInstances.push(this);
  }
  observe(opts) {
    this._type = opts.type;
  }
  disconnect() {
    this._disconnected = true;
  }
  /** Simulate entries. */
  _push(entries) {
    this._callback({ getEntries: () => entries }, this);
  }
}

/* ---------- setup / teardown ---------- */

let origPO;

beforeEach(() => {
  origPO = globalThis.PerformanceObserver;
  observerInstances = [];
  globalThis.PerformanceObserver = MockPerformanceObserver;
});

afterEach(() => {
  globalThis.PerformanceObserver = origPO;
});

/* ---------- createVitalsReporter ---------- */

describe('createVitalsReporter', () => {
  it('returns a reporter object with expected methods', () => {
    const r = createVitalsReporter();
    assert.equal(typeof r.start, 'function');
    assert.equal(typeof r.stop, 'function');
    assert.equal(typeof r.getMetrics, 'function');
  });

  it('getMetrics returns empty object initially', () => {
    const r = createVitalsReporter();
    assert.deepEqual(r.getMetrics(), {});
  });

  it('start creates observers, stop disconnects them', () => {
    const r = createVitalsReporter();
    r.start();
    const count = observerInstances.length;
    assert.ok(count > 0, 'observers created');
    r.stop();
    for (const obs of observerInstances) {
      assert.equal(obs._disconnected, true);
    }
  });

  it('collects metrics reported by observers', () => {
    const reports = [];
    const r = createVitalsReporter({ onReport: (m) => reports.push(m) });
    r.start();
    // Find the TTFB observer (type === 'navigation')
    const ttfbObs = observerInstances.find((o) => o._type === 'navigation');
    assert.ok(ttfbObs, 'TTFB observer exists');
    ttfbObs._push([{ responseStart: 42 }]);
    assert.equal(r.getMetrics().TTFB, 42);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].name, 'TTFB');
    r.stop();
  });
});

/* ---------- individual observe functions ---------- */

describe('observeTTFB', () => {
  it('captures navigation timing and returns cleanup', () => {
    let metric;
    const cleanup = observeTTFB((m) => { metric = m; });
    assert.equal(typeof cleanup, 'function');
    const obs = observerInstances.find((o) => o._type === 'navigation');
    obs._push([{ responseStart: 100 }]);
    assert.equal(metric.name, 'TTFB');
    assert.equal(metric.value, 100);
    cleanup();
    assert.equal(obs._disconnected, true);
  });
});

describe('observeLCP', () => {
  it('reports LCP and returns cleanup', () => {
    let metric;
    const cleanup = observeLCP((m) => { metric = m; });
    assert.equal(typeof cleanup, 'function');
    const obs = observerInstances.find((o) => o._type === 'largest-contentful-paint');
    obs._push([{ startTime: 250 }]);
    assert.equal(metric.name, 'LCP');
    assert.equal(metric.value, 250);
    cleanup();
  });
});

describe('observeFID', () => {
  it('reports FID and returns cleanup', () => {
    let metric;
    const cleanup = observeFID((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'first-input');
    obs._push([{ startTime: 10, processingStart: 18 }]);
    assert.equal(metric.name, 'FID');
    assert.equal(metric.value, 8);
    cleanup();
  });
});

describe('observeCLS', () => {
  it('accumulates layout shift values', () => {
    const values = [];
    const cleanup = observeCLS((m) => { values.push(m.value); });
    const obs = observerInstances.find((o) => o._type === 'layout-shift');
    obs._push([{ value: 0.1, hadRecentInput: false }]);
    obs._push([{ value: 0.05, hadRecentInput: false }]);
    assert.equal(values.length, 2);
    assert.ok(Math.abs(values[1] - 0.15) < 0.001);
    cleanup();
  });

  it('ignores shifts with recent input', () => {
    const values = [];
    observeCLS((m) => { values.push(m.value); });
    const obs = observerInstances.find((o) => o._type === 'layout-shift');
    obs._push([{ value: 0.1, hadRecentInput: true }]);
    assert.equal(values.length, 0);
  });
});

describe('observeFCP', () => {
  it('reports first-contentful-paint entries only', () => {
    let metric;
    const cleanup = observeFCP((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'paint');
    obs._push([{ name: 'first-paint', startTime: 100 }]);
    assert.equal(metric, undefined);
    obs._push([{ name: 'first-contentful-paint', startTime: 200 }]);
    assert.equal(metric.name, 'FCP');
    assert.equal(metric.value, 200);
    cleanup();
  });
});

describe('observeINP', () => {
  it('reports max interaction duration', () => {
    const values = [];
    const cleanup = observeINP((m) => { values.push(m.value); });
    const obs = observerInstances.find((o) => o._type === 'event');
    obs._push([{ duration: 50 }]);
    obs._push([{ duration: 30 }]); // lower, should not report
    obs._push([{ duration: 80 }]);
    assert.deepEqual(values, [50, 80]);
    cleanup();
  });
});

describe('when PerformanceObserver is unavailable', () => {
  it('observe functions return null', () => {
    globalThis.PerformanceObserver = undefined;
    assert.equal(observeLCP(() => {}), null);
    assert.equal(observeTTFB(() => {}), null);
  });

  it('all observe functions return null when PerformanceObserver missing', () => {
    globalThis.PerformanceObserver = undefined;
    assert.equal(observeFID(() => {}), null);
    assert.equal(observeCLS(() => {}), null);
    assert.equal(observeFCP(() => {}), null);
    assert.equal(observeINP(() => {}), null);
  });
});

describe('observeLCP — additional', () => {
  it('metric includes entries array', () => {
    let metric;
    const cleanup = observeLCP((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'largest-contentful-paint');
    const entry = { startTime: 300 };
    obs._push([entry]);
    assert.ok(Array.isArray(metric.entries));
    assert.equal(metric.entries[0], entry);
    cleanup();
  });

  it('each LCP entry fires the callback', () => {
    const values = [];
    const cleanup = observeLCP((m) => values.push(m.value));
    const obs = observerInstances.find((o) => o._type === 'largest-contentful-paint');
    obs._push([{ startTime: 100 }]);
    obs._push([{ startTime: 250 }]);
    assert.deepEqual(values, [100, 250]);
    cleanup();
  });
});

describe('observeFID — additional', () => {
  it('metric includes entries array', () => {
    let metric;
    const cleanup = observeFID((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'first-input');
    const entry = { startTime: 5, processingStart: 15 };
    obs._push([entry]);
    assert.ok(Array.isArray(metric.entries));
    assert.equal(metric.entries[0], entry);
    cleanup();
  });

  it('reports zero FID when processingStart equals startTime', () => {
    let metric;
    const cleanup = observeFID((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'first-input');
    obs._push([{ startTime: 10, processingStart: 10 }]);
    assert.equal(metric.value, 0);
    cleanup();
  });
});

describe('observeCLS — additional', () => {
  it('metric includes all accumulated entries', () => {
    let last;
    const cleanup = observeCLS((m) => { last = m; });
    const obs = observerInstances.find((o) => o._type === 'layout-shift');
    obs._push([{ value: 0.05, hadRecentInput: false }]);
    obs._push([{ value: 0.03, hadRecentInput: false }]);
    assert.equal(last.entries.length, 2);
    cleanup();
  });

  it('CLS value resets per observer instance', () => {
    const values1 = [];
    const values2 = [];
    const c1 = observeCLS((m) => values1.push(m.value));
    const c2 = observeCLS((m) => values2.push(m.value));
    const obs1 = observerInstances[0];
    const obs2 = observerInstances[1];
    obs1._push([{ value: 0.1, hadRecentInput: false }]);
    obs2._push([{ value: 0.2, hadRecentInput: false }]);
    assert.ok(Math.abs(values1[0] - 0.1) < 0.001);
    assert.ok(Math.abs(values2[0] - 0.2) < 0.001);
    c1(); c2();
  });
});

describe('observeINP — additional', () => {
  it('metric includes entries array', () => {
    let metric;
    const cleanup = observeINP((m) => { metric = m; });
    const obs = observerInstances.find((o) => o._type === 'event');
    const entry = { duration: 60 };
    obs._push([entry]);
    assert.ok(Array.isArray(metric.entries));
    assert.equal(metric.entries[0], entry);
    cleanup();
  });

  it('equal duration does not re-report', () => {
    const values = [];
    const cleanup = observeINP((m) => values.push(m.value));
    const obs = observerInstances.find((o) => o._type === 'event');
    obs._push([{ duration: 50 }]);
    obs._push([{ duration: 50 }]); // same — should not fire again
    assert.equal(values.length, 1);
    cleanup();
  });
});

describe('createVitalsReporter — additional', () => {
  it('stop before start does not throw', () => {
    const r = createVitalsReporter();
    assert.doesNotThrow(() => r.stop());
  });

  it('double stop does not throw', () => {
    const r = createVitalsReporter();
    r.start();
    r.stop();
    assert.doesNotThrow(() => r.stop());
  });

  it('getMetrics snapshot is a copy — mutations do not affect internal state', () => {
    const r = createVitalsReporter();
    r.start();
    const snap1 = r.getMetrics();
    snap1.INJECTED = 'hacked';
    const snap2 = r.getMetrics();
    assert.equal(snap2.INJECTED, undefined);
    r.stop();
  });

  it('collects LCP metric via reporter', () => {
    const r = createVitalsReporter();
    r.start();
    const lcpObs = observerInstances.find((o) => o._type === 'largest-contentful-paint');
    lcpObs._push([{ startTime: 180 }]);
    assert.equal(r.getMetrics().LCP, 180);
    r.stop();
  });
});
