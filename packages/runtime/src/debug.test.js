import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { signal } from './signals.js';
import {
  enableDebug,
  disableDebug,
  isDebugEnabled,
  getDebugStats,
  debugSignal,
  debugEffect,
  debugTime,
  debugAssert,
} from './debug.js';

// ─── Test logger captures output without polluting stdout ─────────────────────
function makeLogger() {
  const messages = { debug: [], info: [], warn: [], error: [] };
  return {
    messages,
    debug: (...args) => messages.debug.push(args),
    info:  (...args) => messages.info.push(args),
    warn:  (...args) => messages.warn.push(args),
    error: (...args) => messages.error.push(args),
  };
}

beforeEach(() => disableDebug());
afterEach(() => disableDebug());

// ─────────────────────────────────────────────────────────────────────────────

describe('enableDebug / disableDebug', () => {
  it('starts disabled', () => {
    assert.equal(isDebugEnabled(), false);
  });

  it('enableDebug sets debug mode on', () => {
    enableDebug({ logger: makeLogger() });
    assert.equal(isDebugEnabled(), true);
  });

  it('disableDebug turns it off', () => {
    enableDebug({ logger: makeLogger() });
    disableDebug();
    assert.equal(isDebugEnabled(), false);
  });

  it('accepts a label option', () => {
    const logger = makeLogger();
    enableDebug({ label: 'TestSuite', logger });
    assert.ok(logger.messages.info.some(m => m.join(' ').includes('TestSuite')));
  });

  it('resets stats on disableDebug', () => {
    const logger = makeLogger();
    enableDebug({ logger });
    const s = debugSignal(signal(1), 'x');
    s.set(2);
    disableDebug();
    const stats = getDebugStats();
    assert.equal(stats.signalsCreated, 0);
    assert.equal(stats.signalWrites, 0);
  });
});

describe('debugSignal', () => {
  it('returns a signal-compatible accessor', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(42);
    const ds = debugSignal(s, 'myVal');
    assert.equal(ds(), 42);
  });

  it('set updates the underlying value', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(0);
    const ds = debugSignal(s, 'count');
    ds.set(5);
    assert.equal(ds(), 5);
  });

  it('set accepts an updater function', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(10);
    const ds = debugSignal(s, 'n');
    ds.set(n => n * 2);
    assert.equal(ds(), 20);
  });

  it('peek returns value without tracking', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(7);
    const ds = debugSignal(s, 'p');
    assert.equal(ds.peek(), 7);
  });

  it('increments signalsCreated stat', () => {
    enableDebug({ logger: makeLogger() });
    const before = getDebugStats().signalsCreated;
    debugSignal(signal(0), 'a');
    debugSignal(signal(0), 'b');
    assert.equal(getDebugStats().signalsCreated, before + 2);
  });

  it('increments signalWrites stat on set', () => {
    enableDebug({ logger: makeLogger() });
    const ds = debugSignal(signal(0), 'w');
    ds.set(1);
    ds.set(2);
    assert.equal(getDebugStats().signalWrites, 2);
  });

  it('logs creation with initial value', () => {
    const logger = makeLogger();
    enableDebug({ logger });
    debugSignal(signal(99), 'initial');
    const msgs = logger.messages.debug;
    assert.ok(msgs.some(m => m.join(' ').includes('signal:initial') && m.join(' ').includes('created')));
  });

  it('logs set with before/after values', () => {
    const logger = makeLogger();
    enableDebug({ logger });
    const ds = debugSignal(signal(0), 'log-set');
    ds.set(5);
    const msgs = logger.messages.debug;
    assert.ok(msgs.some(m => {
      const str = m.join(' ');
      return str.includes('signal:log-set') && str.includes('set');
    }));
  });

  it('does not log when debug is disabled', () => {
    const logger = makeLogger();
    // debug is off (beforeEach calls disableDebug)
    const s = signal(0);
    debugSignal(s, 'nolog');
    assert.equal(logger.messages.debug.length, 0);
  });
});

describe('debugEffect', () => {
  it('executes the effect function', () => {
    enableDebug({ logger: makeLogger() });
    let called = false;
    const handle = debugEffect(() => { called = true; }, 'test-effect');
    assert.equal(called, true);
    handle.dispose();
  });

  it('re-runs when a dependency changes', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(0);
    let runCount = 0;
    const handle = debugEffect(() => { s(); runCount++; }, 're-run');
    assert.equal(runCount, 1);
    s.set(1);
    assert.equal(runCount, 2);
    handle.dispose();
  });

  it('increments effectsCreated stat', () => {
    enableDebug({ logger: makeLogger() });
    const before = getDebugStats().effectsCreated;
    const h = debugEffect(() => {}, 'ec');
    assert.equal(getDebugStats().effectsCreated, before + 1);
    h.dispose();
  });

  it('increments effectRuns stat on each run', () => {
    enableDebug({ logger: makeLogger() });
    const s = signal(0);
    const before = getDebugStats().effectRuns;
    const h = debugEffect(() => { s(); }, 'er');
    s.set(1);
    s.set(2);
    assert.equal(getDebugStats().effectRuns, before + 3);
    h.dispose();
  });

  it('logs run start and end', () => {
    const logger = makeLogger();
    enableDebug({ logger });
    const h = debugEffect(() => {}, 'logged-effect');
    const msgs = logger.messages.debug;
    assert.ok(msgs.some(m => m.join(' ').includes('effect:logged-effect') && m.join(' ').includes('started')));
    assert.ok(msgs.some(m => m.join(' ').includes('effect:logged-effect') && m.join(' ').includes('done')));
    h.dispose();
  });
});

describe('debugTime', () => {
  it('returns the function return value', () => {
    enableDebug({ logger: makeLogger() });
    const result = debugTime('test', () => 42);
    assert.equal(result, 42);
  });

  it('still returns the value when debug is disabled', () => {
    // debug off
    const result = debugTime('noop', () => 'hello');
    assert.equal(result, 'hello');
  });

  it('logs timing when enabled', () => {
    const logger = makeLogger();
    enableDebug({ logger });
    debugTime('my-op', () => {});
    assert.ok(logger.messages.info.some(m => m.join(' ').includes('my-op')));
  });

  it('propagates exceptions from the wrapped function', () => {
    enableDebug({ logger: makeLogger() });
    assert.throws(
      () => debugTime('throws', () => { throw new Error('boom'); }),
      /boom/
    );
  });
});

describe('debugAssert', () => {
  it('does not throw when condition is true', () => {
    enableDebug({ logger: makeLogger() });
    assert.doesNotThrow(() => debugAssert(true, 'should pass'));
  });

  it('throws when condition is false', () => {
    enableDebug({ logger: makeLogger() });
    assert.throws(
      () => debugAssert(false, 'invariant violated'),
      /Assertion failed.*invariant violated/
    );
  });

  it('is a no-op when debug is disabled', () => {
    // debug is off
    assert.doesNotThrow(() => debugAssert(false, 'ignored'));
  });
});

describe('getDebugStats', () => {
  it('returns a snapshot (not a live reference)', () => {
    enableDebug({ logger: makeLogger() });
    const snap1 = getDebugStats();
    debugSignal(signal(0), 'snap');
    const snap2 = getDebugStats();
    assert.notEqual(snap1.signalsCreated, snap2.signalsCreated);
  });
});
