/**
 * The `@feature` template directive.
 *
 * Registers itself with @basenative/runtime's directive registry as a side effect of
 * importing this module (see index.js) — @basenative/runtime and @basenative/server
 * never import @basenative/flags directly, so the core stays dependency-free of it.
 *
 * Usage:
 *
 *   <template @feature="newDashboard">
 *     <p>New dashboard</p>
 *   </template>
 *   <template @else>
 *     <p>Classic dashboard</p>
 *   </template>
 *
 * `@feature` reads `ctx.$flags` from the render/hydrate context — an object with a
 * *synchronous* `isEnabled(name)` method. `createFlagManager().isEnabled()` is async
 * (it awaits the provider), while template rendering itself is synchronous end to
 * end, so a flag manager cannot be dropped onto `ctx.$flags` directly. Resolve flags
 * once, ahead of render, with `createFlagContext()` below.
 *
 * Design decision: with no usable `$flags` on context, `@feature` treats the flag as
 * disabled — it renders the `@else` branch if one is present, otherwise nothing — and
 * emits a `BN_FEATURE_NO_PROVIDER` diagnostic. It never guesses "enabled" for a flag
 * it cannot evaluate.
 */
import { registerDirective } from '@basenative/runtime/shared/directives';
import { emitDiagnostic } from '@basenative/runtime';

function resolveFeature(name, ctx, options) {
  const flags = ctx?.$flags;
  if (!flags || typeof flags.isEnabled !== 'function') {
    emitDiagnostic(options, {
      level: 'warn',
      domain: 'template',
      code: 'BN_FEATURE_NO_PROVIDER',
      message: `@feature="${name}" has no flags provider on context ($flags); treating it as disabled`,
    });
    return false;
  }
  return Boolean(flags.isEnabled(name));
}

registerDirective('feature', {
  on: 'template',
  server: (value, ctx, options) => resolveFeature(value, ctx, options),
  client: (value, ctx, options) => resolveFeature(value, ctx, options),
});

/**
 * Resolve every flag for `context` once, ahead of render, and return a plain
 * synchronous snapshot suitable for `ctx.$flags`.
 *
 * @param {ReturnType<typeof import('./flags.js').createFlagManager>} flagManager
 * @param {object} [context] - Evaluation context passed to `flagManager.getAll`.
 * @returns {Promise<{ flags: Record<string, boolean>, isEnabled: (name: string) => boolean }>}
 */
export async function createFlagContext(flagManager, context = {}) {
  const flags = await flagManager.getAll(context);
  return {
    flags,
    isEnabled: (name) => Boolean(flags[name]),
  };
}
