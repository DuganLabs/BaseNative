/**
 * Slots the core calls on the way through signal, effect, and hydrate.
 * They stay empty until `@basenative/runtime/devtools` loads and
 * `enableDevtools()` installs the recorders. A bundle that never
 * imports that module keeps these no-ops: no registry, no WeakMaps,
 * no global hook.
 */
export const devtoolsHooks = {
  trackSignal() {},
  trackEffect() {},
  recordHydration() {},
};
