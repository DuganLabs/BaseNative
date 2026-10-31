/**
 * Debug/DevTools hooks for BaseNative.
 *
 * Exposes signal inspection, dependency tracking, and hydration timeline
 * through a global hook for browser extension integration.
 *
 * Import this module (`@basenative/runtime/devtools`) only in development.
 * The runtime core calls empty slots until `enableDevtools()` installs
 * the recorders, so a production bundle that never imports this file
 * does not ship the registry.
 */
import { devtoolsHooks } from './devtools-hooks.js';

const devtoolsState = {
  signals: new Map(),
  effects: new Map(),
  hydrations: [],
  enabled: false,
};

let nextSignalId = 1;
let nextEffectId = 1;
// Accessor/handle -> registration id, so a repeat track call relabels
// the existing registration instead of adding a duplicate. Replaced
// (not cleared — WeakMaps cannot be) when devtools are disabled.
let signalIds = new WeakMap();
let effectIds = new WeakMap();

/**
 * Enables devtools instrumentation.
 * Call this before creating signals or hydrating.
 */
export function enableDevtools() {
  devtoolsHooks.trackSignal = trackSignal;
  devtoolsHooks.trackEffect = trackEffect;
  devtoolsHooks.recordHydration = recordHydration;
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
 * Shared registration path for trackSignal/trackEffect. A repeat call
 * with the same key updates the existing entry (the label, plus any
 * defined extras) and returns its id; otherwise a new entry is minted.
 */
function registerTracked(registry, ids, key, label, prefix, extra, mintId) {
  const existing = ids.get(key);
  if (existing !== undefined) {
    const info = registry.get(existing);
    if (info) {
      if (label) info.label = label;
      if (extra) {
        for (const k of Object.keys(extra)) {
          if (extra[k] !== undefined) info[k] = extra[k];
        }
      }
    }
    return existing;
  }
  const id = mintId();
  ids.set(key, id);
  registry.set(id, { label: label || `${prefix}_${id}`, ...extra });
  return id;
}

/**
 * Registers a signal for devtools inspection. signal() calls this on
 * creation whenever devtools are enabled, so registration is
 * automatic; call it directly only to attach a label.
 */
export function trackSignal(accessor, label, subscriberCount) {
  if (!devtoolsState.enabled) return;
  return registerTracked(devtoolsState.signals, signalIds, accessor, label, 'signal',
    { accessor, subscriberCount }, () => nextSignalId++);
}

/**
 * Registers an effect for devtools inspection. createEffect() calls
 * this on creation whenever devtools are enabled; call it directly
 * only to attach a label.
 */
export function trackEffect(handle, label, disposed) {
  if (!devtoolsState.enabled) return;
  return registerTracked(devtoolsState.effects, effectIds, handle, label, 'effect',
    { disposed }, () => nextEffectId++);
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
  signalIds = new WeakMap();
  effectIds = new WeakMap();

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
