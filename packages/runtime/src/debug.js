/**
 * Debug mode for BaseNative.
 *
 * Wraps signal/effect/hydrate with verbose console logging to help
 * diagnose reactivity issues during development. Zero overhead when
 * debug mode is off — the wrappers are not active in production.
 *
 * Usage:
 *   import { enableDebug, debugSignal } from '@basenative/runtime/src/debug.js';
 *
 *   enableDebug({ label: 'MyPage' });
 *   const count = debugSignal(signal(0), 'count');
 *   // → [BN:debug] signal:count created (0)
 *   // → [BN:debug] signal:count set (1)
 */

import { signal, effect } from './signals.js';

let _debugEnabled = false;
let _label = '';
let _logger = typeof console !== 'undefined' ? console : null;

const stats = {
  signalsCreated: 0,
  effectsCreated: 0,
  signalWrites: 0,
  signalReads: 0,
  effectRuns: 0,
};

function log(level, ...args) {
  if (!_debugEnabled || !_logger) return;
  const prefix = _label ? `[BN:debug:${_label}]` : '[BN:debug]';
  _logger[level]?.(prefix, ...args);
}

/**
 * Enable debug mode.
 * @param {object} [opts]
 * @param {string} [opts.label]      - Prefix for log messages (e.g. 'HomePage')
 * @param {object} [opts.logger]     - Custom logger (default: console)
 * @param {boolean} [opts.trackReads] - Also log signal reads (very verbose, default: false)
 */
export function enableDebug(opts = {}) {
  _debugEnabled = true;
  _label = opts.label ?? '';
  _logger = opts.logger ?? (typeof console !== 'undefined' ? console : null);
  _debugEnabled = true;

  if (opts.trackReads !== undefined) {
    _config.trackReads = Boolean(opts.trackReads);
  }

  log('info', 'debug mode enabled', opts.label ? `(${opts.label})` : '');
}

/**
 * Disable debug mode and reset stats.
 */
export function disableDebug() {
  log('info', 'debug mode disabled. stats:', getDebugStats());
  _debugEnabled = false;
  _label = '';
  Object.assign(stats, {
    signalsCreated: 0,
    effectsCreated: 0,
    signalWrites: 0,
    signalReads: 0,
    effectRuns: 0,
  });
}

/** Returns whether debug mode is active. */
export function isDebugEnabled() {
  return _debugEnabled;
}

/** Returns accumulated debug statistics. */
export function getDebugStats() {
  return { ...stats };
}

// Internal config
const _config = {
  trackReads: false,
};

/**
 * Wraps a signal with debug logging.
 *
 * @param {Function} s       - A signal created with signal()
 * @param {string}   name    - Label for log messages
 * @returns {Function}       - Wrapped signal with identical API
 */
export function debugSignal(s, name = 'signal') {
  stats.signalsCreated++;
  log('debug', `signal:${name} created`, `(${s()})`);

  const wrapped = () => {
    if (_config.trackReads) {
      stats.signalReads++;
      log('debug', `signal:${name} read →`, s());
    }
    return s();
  };

  wrapped.set = (next) => {
    const before = s();
    s.set(next);
    const after = s();
    if (_debugEnabled) {
      stats.signalWrites++;
      log('debug', `signal:${name} set`, before, '→', after);
    }
  };

  wrapped.peek = () => s.peek();

  return wrapped;
}

/**
 * Wraps an effect with debug logging — logs execution count and timing.
 *
 * @param {Function} fn     - Effect function
 * @param {string}   name   - Label for log messages
 * @returns {Function}      - Effect dispose handle
 */
export function debugEffect(fn, name = 'effect') {
  stats.effectsCreated++;
  let runCount = 0;

  const handle = effect(() => {
    runCount++;
    stats.effectRuns++;

    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    log('debug', `effect:${name} run #${runCount} started`);

    const result = fn();

    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    log('debug', `effect:${name} run #${runCount} done (${duration.toFixed(2)}ms)`);

    return result;
  });

  return handle;
}

/**
 * Logs a timing measurement. Use around operations you want to profile.
 *
 * @param {string}   label
 * @param {Function} fn
 * @returns {*} The return value of fn
 */
export function debugTime(label, fn) {
  if (!_debugEnabled) return fn();
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let result;
  try {
    result = fn();
  } finally {
    const ms = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(2);
    log('info', `⏱ ${label}: ${ms}ms`);
  }
  return result;
}

/**
 * Asserts a reactive invariant in debug mode. No-op in production.
 *
 * @param {boolean}  condition
 * @param {string}   message
 */
export function debugAssert(condition, message) {
  if (!_debugEnabled) return;
  if (!condition) {
    log('error', `assertion failed: ${message}`);
    throw new Error(`[BN:debug] Assertion failed: ${message}`);
  }
}

/**
 * Logs a signal's current dependency graph (immediate subscribers only).
 * Useful for diagnosing why a computed is or isn't re-evaluating.
 *
 * @param {Function} s     - A signal or computed
 * @param {string}   name
 */
export function debugDeps(s, name = 'signal') {
  if (!_debugEnabled) return;
  const value = typeof s === 'function' ? s() : s;
  log('info', `deps:${name} current value:`, value);
}
