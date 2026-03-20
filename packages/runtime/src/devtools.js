/**
 * Debug/DevTools hooks for BaseNative.
 *
 * Exposes signal inspection, dependency tracking, and hydration timeline
 * through a global hook for browser extension integration.
 */

const devtoolsState = {
  signals: new Map(),
  effects: new Map(),
  hydrations: [],
  enabled: false,
};

let nextSignalId = 1;
let nextEffectId = 1;

/**
 * Enables devtools instrumentation.
 * Call this before creating signals or hydrating.
 */
export function enableDevtools() {
  devtoolsState.enabled = true;

  if (typeof globalThis !== 'undefined') {
    globalThis.__BASENATIVE_DEVTOOLS__ = {
      getSignals: () => [...devtoolsState.signals.entries()].map(([id, info]) => ({
        id,
        label: info.label,
        value: info.accessor(),
        subscriberCount: info.subscriberCount?.() ?? 0,
      })),
      getEffects: () => [...devtoolsState.effects.entries()].map(([id, info]) => ({
        id,
        label: info.label,
        disposed: info.disposed?.() ?? false,
      })),
      getHydrations: () => [...devtoolsState.hydrations],
      getState: () => ({ ...devtoolsState, signalCount: devtoolsState.signals.size, effectCount: devtoolsState.effects.size }),
    };
  }
}

/**
 * Registers a signal for devtools inspection.
 */
export function trackSignal(accessor, label) {
  if (!devtoolsState.enabled) return;

  const id = nextSignalId++;
  devtoolsState.signals.set(id, {
    label: label || `signal_${id}`,
    accessor,
  });

  return id;
}

/**
 * Registers an effect for devtools inspection.
 */
export function trackEffect(handle, label) {
  if (!devtoolsState.enabled) return;

  const id = nextEffectId++;
  devtoolsState.effects.set(id, {
    label: label || `effect_${id}`,
    disposed: () => false,
  });

  return id;
}

/**
 * Records a hydration event for the timeline.
 */
export function recordHydration(root, details = {}) {
  if (!devtoolsState.enabled) return;

  devtoolsState.hydrations.push({
    timestamp: Date.now(),
    root: root?.tagName || 'unknown',
    directivesProcessed: details.directivesProcessed || 0,
    duration: details.duration || 0,
  });
}

/**
 * Disables devtools and cleans up.
 */
export function disableDevtools() {
  devtoolsState.enabled = false;
  devtoolsState.signals.clear();
  devtoolsState.effects.clear();
  devtoolsState.hydrations = [];

  if (typeof globalThis !== 'undefined') {
    delete globalThis.__BASENATIVE_DEVTOOLS__;
  }
}

/**
 * Returns whether devtools are enabled.
 */
export function isDevtoolsEnabled() {
  return devtoolsState.enabled;
}
