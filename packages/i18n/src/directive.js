/**
 * The `@t` template directive.
 *
 * Registers itself with @basenative/runtime's directive registry as a side effect of
 * importing this module (see index.js) — @basenative/runtime and @basenative/server
 * never import @basenative/i18n directly, so the core stays dependency-free of it.
 *
 * Usage:
 *
 *   <h1 @t="nav.home">Home</h1>
 *
 * `@t` reads `ctx.$i18n` from the render/hydrate context — an i18n instance from
 * `createI18n()` — and replaces the element's text content with
 * `i18n.t(key, ctx)`. Passing the whole render context as `params` means any
 * `{name}`-style placeholder in the message (i18n's own interpolation syntax, not
 * BaseNative's `{{ }}`) is filled from a same-named property already in scope —
 * no second templating syntax is introduced for message parameters.
 *
 * Design decision: with no usable `$i18n` on context, `@t` leaves the element's
 * existing content untouched (it does not blank it) and emits a
 * `BN_T_NO_PROVIDER` diagnostic — whatever fallback markup the template author put
 * inside the element (e.g. `<h1 @t="nav.home">Home</h1>`) still renders.
 *
 * `createI18n()` does not expose a @basenative/runtime signal for its locale — only
 * the plain `onLocaleChange(fn)` callback below — so client-side reactivity is built
 * from it directly: each i18n instance gets one internal signal ("tick") that the
 * directive's `client` handler reads before calling `t()`, and an `onLocaleChange`
 * subscription bumps that tick on every `setLocale()`. Reading a signal inside the
 * `effect()` that hydrate.js already wraps every `@t` element in is what makes it
 * re-render — the directive itself needs no bespoke DOM update path.
 */
import { registerDirective } from '@basenative/runtime/shared/directives';
import { emitDiagnostic, signal } from '@basenative/runtime';

const localeTicks = new WeakMap();

function getLocaleTick(i18n) {
  let tick = localeTicks.get(i18n);
  if (!tick) {
    tick = signal(0);
    i18n.onLocaleChange(() => tick.set((n) => n + 1));
    localeTicks.set(i18n, tick);
  }
  return tick;
}

function resolveMessage(key, ctx, options) {
  const i18n = ctx?.$i18n;
  if (!i18n || typeof i18n.t !== 'function') {
    emitDiagnostic(options, {
      level: 'warn',
      domain: 'template',
      code: 'BN_T_NO_PROVIDER',
      message: `@t="${key}" has no i18n instance on context ($i18n); leaving existing content unchanged`,
    });
    return undefined;
  }
  return i18n.t(key, ctx);
}

registerDirective('t', {
  on: 'element',
  server: (value, ctx, options) => resolveMessage(value, ctx, options),
  client: (value, ctx, options) => {
    const i18n = ctx?.$i18n;
    if (i18n && typeof i18n.onLocaleChange === 'function') getLocaleTick(i18n)();
    return resolveMessage(value, ctx, options);
  },
});
