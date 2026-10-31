import type { EffectHandle, Signal } from './index.js';

/**
 * Enables devtools instrumentation and installs `globalThis.__BASENATIVE_DEVTOOLS__`.
 * Call this before creating the signals you want recorded. Import this module
 * from `@basenative/runtime/devtools` — it is not on the main entry, so a
 * production bundle that never imports it does not ship the registry.
 */
export function enableDevtools(): void;

/** Disables devtools and clears all tracked signals, effects, and hydrations. */
export function disableDevtools(): void;

/** Returns whether devtools instrumentation is enabled. */
export function isDevtoolsEnabled(): boolean;

/** Registers a signal for devtools inspection; a no-op unless devtools are enabled. */
export function trackSignal(accessor: Signal<unknown>, label?: string, subscriberCount?: () => number): number | undefined;

/** Registers an effect for devtools inspection; a no-op unless devtools are enabled. */
export function trackEffect(handle: EffectHandle, label?: string, disposed?: () => boolean): number | undefined;

/** Records a hydration event on the devtools timeline; a no-op unless devtools are enabled. */
export function recordHydration(
  root: Element | null | undefined,
  details?: { directivesProcessed?: number; duration?: number },
): void;
