/**
 * Web Vitals reporting — lightweight, zero-dependency metric collection.
 * Uses the PerformanceObserver API to track LCP, FID, CLS, FCP, TTFB, and INP.
 */

/**
 * Safely create a PerformanceObserver for a given entry type.
 * Returns null if the browser does not support the type.
 */
function createObserver(type, callback) {
  if (typeof PerformanceObserver === 'undefined') return null;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });
    observer.observe({ type, buffered: true });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Observe Largest Contentful Paint.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeLCP(callback) {
  const observer = createObserver('largest-contentful-paint', (entry) => {
    callback({ name: 'LCP', value: entry.startTime, entries: [entry] });
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * Observe First Input Delay.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeFID(callback) {
  const observer = createObserver('first-input', (entry) => {
    callback({
      name: 'FID',
      value: entry.processingStart - entry.startTime,
      entries: [entry],
    });
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * Observe Cumulative Layout Shift.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeCLS(callback) {
  let clsValue = 0;
  const allEntries = [];
  const observer = createObserver('layout-shift', (entry) => {
    if (entry.hadRecentInput) return;
    clsValue += entry.value;
    allEntries.push(entry);
    callback({ name: 'CLS', value: clsValue, entries: allEntries });
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * Observe First Contentful Paint.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeFCP(callback) {
  const observer = createObserver('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      callback({ name: 'FCP', value: entry.startTime, entries: [entry] });
    }
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * Observe Time to First Byte.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeTTFB(callback) {
  const observer = createObserver('navigation', (entry) => {
    callback({
      name: 'TTFB',
      value: entry.responseStart,
      entries: [entry],
    });
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * Observe Interaction to Next Paint.
 * @param {Function} callback  Receives { name, value, entries }
 * @returns {Function|null} cleanup
 */
export function observeINP(callback) {
  let maxDuration = 0;
  const observer = createObserver('event', (entry) => {
    const duration = entry.duration;
    if (duration > maxDuration) {
      maxDuration = duration;
      callback({ name: 'INP', value: duration, entries: [entry] });
    }
  });
  return observer ? () => observer.disconnect() : null;
}

/**
 * createVitalsReporter(options) — aggregated Web Vitals reporter.
 *
 * @param {object}   options
 * @param {Function} [options.onReport]  Called for every metric update
 * @param {object}   [options.threshold] Per-metric thresholds (unused by default)
 * @returns {{ start, stop, getMetrics }}
 */
export function createVitalsReporter(options = {}) {
  const { onReport } = options;
  const metrics = {};
  const cleanups = [];

  function handleMetric(metric) {
    metrics[metric.name] = metric.value;
    onReport?.(metric);
  }

  return {
    /** Begin observing all Web Vitals. */
    start() {
      const observers = [
        observeLCP(handleMetric),
        observeFID(handleMetric),
        observeCLS(handleMetric),
        observeFCP(handleMetric),
        observeTTFB(handleMetric),
        observeINP(handleMetric),
      ];
      for (const cleanup of observers) {
        if (cleanup) cleanups.push(cleanup);
      }
    },

    /** Stop all observers. */
    stop() {
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },

    /** Return a snapshot of collected metrics. */
    getMetrics() {
      return { ...metrics };
    },
  };
}
