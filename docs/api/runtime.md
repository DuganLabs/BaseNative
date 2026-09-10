# @basenative/runtime API

## `signal(initial)`

Creates a reactive signal.

```js
const count = signal(0);
count();        // read: 0
count.set(5);   // write
count.set(c => c + 1); // updater
count.peek();   // read without subscribing
```

## `computed(fn)`

Creates a derived signal that re-evaluates when dependencies change.

```js
const double = computed(() => count() * 2);
```

## `effect(fn)`

Runs a function reactively. Re-runs when any signal read inside changes. Returns a handle with `.dispose()`.

```js
const stop = effect(() => {
  console.log('Count is', count());
  return () => console.log('cleanup');
});
stop.dispose(); // stops the effect
```

## `batch(fn)`

Groups multiple signal writes into a single effect flush. Effects that read signals written inside `fn` run once, after `fn` returns, instead of once per write.

```js
batch(() => {
  firstName.set('Ada');
  lastName.set('Lovelace');
}); // dependent effects run once, not twice
```

Batches nest — only the outermost `batch()` call triggers the flush. Returns whatever `fn` returns. If `fn` throws, pending effects still flush before the error propagates.

## `registerPlugin(plugin)`

Registers a hook that observes every signal write across the whole runtime. Returns an unregister function.

```js
const unregister = registerPlugin({
  onSignalWrite(sig, previousValue, nextValue) {
    console.log('signal changed', previousValue, '->', nextValue);
  },
});
unregister(); // stop observing
```

This is a single global hook list, separate from the lifecycle plugin system in [`createPluginRegistry()`](#plugins) below — `onSignalWrite` fires on every `.set()` call in the process, so keep it cheap. Untested and unused elsewhere in this repo as of this writing; treat it as a low-level extension point.

## `hydrate(root, ctx, options?)`

Activates template directives in a DOM subtree. Returns a dispose function.

```js
const dispose = hydrate(document.getElementById('app'), {
  count,
  items: signal([]),
  increment() { count.set(c => c + 1); },
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `onDiagnostic` | `(diagnostic) => void` | Callback for diagnostic events |
| `onMismatch` | `(message, detail) => void` | Callback for hydration mismatches |
| `recover` | `'client' \| 'throw'` | Mismatch recovery strategy |

## Template Directives

### `@if` / `@else`

```html
<template @if="isLoggedIn()">
  <p>Welcome back!</p>
</template>
<template @else>
  <p>Please log in.</p>
</template>
```

### `@for` / `@empty`

```html
<template @for="item of items(); track item.id">
  <div>{{ item.name }}</div>
</template>
<template @empty>
  <p>No items.</p>
</template>
```

Loop variables: `$index`, `$first`, `$last`, `$even`, `$odd`.

### `@switch` / `@case` / `@default`

```html
<template @switch="status()">
  <template @case="'active'"><span>Active</span></template>
  <template @case="'inactive'"><span>Inactive</span></template>
  <template @default><span>Unknown</span></template>
</template>
```

### Event Binding — `@event`

```html
<button @click="handleClick()">Click</button>
<input @input="updateValue($event.target.value)">
```

### Attribute Binding — `:attr`

```html
<button :disabled="isLoading()">Save</button>
<div :class="isActive() ? 'active' : ''">Content</div>
```

### Text Interpolation — `{{ }}`

```html
<p>Hello, {{ name() }}!</p>
<span>{{ items().length }} items</span>
```

### Custom Directives — `registerDirective(name, config)`

`@if`/`@for`/`@switch`/`@defer` are built into `render()` and `hydrate()` directly. Other packages contribute directives (`@feature` from `@basenative/flags`, `@t` from `@basenative/i18n`) through this registry instead, so `@basenative/runtime` and `@basenative/server` never import them — they only consult the registry by name. Importing a directive-providing package registers it as a side effect; `render()`/`hydrate()` need no further wiring.

```js
import { registerDirective } from '@basenative/runtime';
// or: import { registerDirective } from '@basenative/runtime/shared/directives';

registerDirective('tooltip', {
  on: 'element',                                    // 'template' | 'element' (default)
  server: (value, ctx, options) => value,           // string (or raw()) to use as text content
  client: (value, ctx, options) => value,
});
```

Two kinds, matching the two places a `@name` attribute appears:

- **`on: 'template'`** — control flow on a `<template>`, dispatched like `@if`: the handler returns a boolean. `true` renders the template's own content; `false` renders a following `<template @else>` sibling if present, otherwise nothing. Example: `@feature`.
- **`on: 'element'`** (default) — content on any other element, dispatched like `{{ }}`: the handler returns the string (or a `raw()`-wrapped HTML string) to use as the element's text content. Returning `undefined` leaves the element's existing content untouched — a directive can fall back to whatever static markup the template already has. Example: `@t`.

`server` and `client` are both optional — supply whichever side(s) the directive needs. Both are called as `(value, ctx, options) => result`, where `value` is the attribute's raw string value. On the client, if the handler reads a `signal()` internally, the surrounding `effect()` that `hydrate()` already wraps every directive-driven update in re-runs automatically — no extra reactivity plumbing needed.

Also exported: `unregisterDirective(name)` and `getDirective(name)` (mainly for tests), and `listDirectives()`.

## `detectBrowserFeatures()`

Returns a `BrowserFeatures` object with support flags.

## `supportsFeature(name)`

Checks a single feature: `'dialog'`, `'popover'`, `'anchorPositioning'`, `'baseSelect'`.

## `emitDiagnostic(options, diagnostic)`

Emits a structured diagnostic through the options callback.

## `reportHydrationMismatch(options, message, detail?)`

Reports a hydration mismatch event.

## DevTools

Instrumentation hooks that expose signal/effect/hydration state to a browser extension through `globalThis.__BASENATIVE_DEVTOOLS__`.

### `enableDevtools()`

Turns on devtools instrumentation and installs `globalThis.__BASENATIVE_DEVTOOLS__`, with `getSignals()`, `getEffects()`, `getHydrations()`, and `getState()`. Call before creating the signals/effects you want visible — anything created earlier is not retroactively tracked.

### `disableDevtools()`

Turns instrumentation off, clears tracked signals/effects/hydrations, and removes `globalThis.__BASENATIVE_DEVTOOLS__`.

### `isDevtoolsEnabled()`

Returns whether devtools are currently enabled.

### `trackSignal(accessor, label?)`

Registers a signal for inspection. A no-op (returns `undefined`) unless devtools are enabled. Returns a numeric id otherwise.

### `trackEffect(handle, label?)`

Registers an effect for inspection. A no-op unless devtools are enabled. Returns a numeric id otherwise.

### `recordHydration(root, details?)`

Appends a hydration event (`{ timestamp, root: root.tagName, directivesProcessed, duration }`) to the devtools timeline. A no-op unless devtools are enabled.

```js
import { enableDevtools, trackSignal, signal } from '@basenative/runtime';

enableDevtools();
const count = signal(0);
trackSignal(count, 'count');
// globalThis.__BASENATIVE_DEVTOOLS__.getSignals()
//   -> [{ id: 1, label: 'count', value: 0, subscriberCount: 0 }]
```

### Notes

- Guards `typeof globalThis !== 'undefined'` before installing the hook, so `enableDevtools()` is safe to call during SSR — there is just no extension to attach to.
- `trackSignal`/`trackEffect`/`recordHydration` check `enabled` first, so leaving these calls in production code costs almost nothing once `enableDevtools()` is never called.
- This module has no dedicated test file in `packages/runtime/src/` as of this writing; the description above is read directly from source.

## Debug Mode

Verbose console logging for diagnosing reactivity issues during development. Zero overhead when off.

### `enableDebug(options?)`

| Option | Type | Description |
|--------|------|-------------|
| `label` | `string` | Prefix included in every log line |
| `logger` | `object` | Custom logger (default: `console`) |
| `trackReads` | `boolean` | Also log every signal read (very verbose, default `false`) |

### `disableDebug()`

Turns debug mode off, logs a final `getDebugStats()` snapshot, and resets the counters to zero.

### `isDebugEnabled()`

Returns whether debug mode is active.

### `getDebugStats()`

Returns a snapshot: `{ signalsCreated, effectsCreated, signalWrites, signalReads, effectRuns }`. Mutating the returned object does not affect internal state.

### `debugSignal(signal, name?)`

Wraps a signal created with `signal()` so every `.set()` call (and, if `trackReads` is on, every read) is logged. Returns a wrapper with the same `()` / `.set()` / `.peek()` shape.

### `debugEffect(fn, name?)`

Wraps an effect body so every run is timed and logged. Returns the same dispose handle `effect()` returns.

### `debugTime(label, fn)`

Runs `fn`, logs its wall-clock duration, and returns its result. When debug mode is off, still runs `fn` and returns its result — only the timing log is skipped.

### `debugAssert(condition, message)`

Throws `Error('[BN:debug] Assertion failed: ' + message)` when `condition` is falsy. A full no-op when debug mode is off — it returns immediately without acting on `condition`, so it never throws in that state. Do not rely on it for invariants that must hold in production.

### `debugDeps(signal, name?)`

Logs a signal's current value. A no-op when debug mode is off.

```js
import { enableDebug, debugSignal, debugEffect, signal } from '@basenative/runtime';

enableDebug({ label: 'HomePage' });
const count = debugSignal(signal(0), 'count');
debugEffect(() => console.log('count is', count()), 'log-count');
count.set(1);
// [BN:debug:HomePage] signal:count set 0 → 1
```

### Notes

- Logging goes through the injected `logger` (default `console`) — pass a custom `logger` in `enableDebug()` for SSR runtimes without a browser-shaped console, or leave debug mode off in production.
- `enableDebug`/`debugSignal`/`debugEffect` add real overhead (extra closures, `performance.now()` calls, log formatting) — this module is for development, not for always-on production instrumentation (use [DevTools](#devtools) or [Web Vitals](#web-vitals) for that).

## Error Boundaries

Programmatic try/catch helpers for template and SSR rendering. Despite a comment in `packages/runtime/src/error-boundary.js` describing a `@catch` template directive, no such directive is registered anywhere in source — these are called directly from JavaScript, not from markup.

### `createErrorBoundary(options?)`

| Option | Type | Description |
|--------|------|-------------|
| `onError` | `(error) => void` | Called when `.try()` catches an error |
| `fallback` | `string` | Fallback HTML returned by `.getFallback()` |

Returns a boundary object:

| Method | Description |
|--------|-------------|
| `try(fn)` | Runs `fn()` and returns its result, or catches, records the error, calls `onError`, and returns `null` |
| `getError()` | Returns the last caught error, or `null` |
| `hasError()` | Returns whether an error has been caught |
| `getFallback()` | Returns the configured `fallback` string, or `''` |
| `reset()` | Clears the error state so the boundary can be reused |

```js
const boundary = createErrorBoundary({
  onError(error) { logger.error('render failed', error); },
  fallback: '<p>Something went wrong.</p>',
});

const html = boundary.try(() => renderList(items())) ?? boundary.getFallback();
```

### `renderWithBoundary(renderFn, options?)`

One-shot version for a single render call — no reusable boundary object. `options` takes the same `onError`/`fallback` shape as `createErrorBoundary`.

```js
const html = renderWithBoundary(() => render(template, data), {
  fallback: '<p>Unable to render this section.</p>',
});
```

If `fallback` is omitted and `renderFn` throws, it returns an HTML comment — `<!-- BaseNative render error: <message> -->` — with `--` in the message replaced by `- -` so the error text can't close the comment early.

### Notes

- Both catch synchronous errors only — neither awaits a returned promise, so a rejected async render is not caught.
- `createErrorBoundary().try()` also emits a `BN_ERROR_BOUNDARY_CAUGHT` diagnostic through [`emitDiagnostic`](#emitdiagnosticoptions-diagnostic); `renderWithBoundary` does not.

## Plugins

A lifecycle-hook and custom-directive registry, distinct from the signal-write hook registered by [`registerPlugin`](#registerpluginplugin) above.

### `definePlugin(config)`

Validates and returns a plugin descriptor `{ name, setup }` from `config: { name, setup? }`. Throws if `name` is missing or an empty string. `setup` defaults to a no-op if omitted.

### `createPluginRegistry()`

Creates an isolated registry:

| Method | Description |
|--------|-------------|
| `register(plugin)` | Registers a plugin (from `definePlugin`) and immediately calls its `setup(api)`. Throws if a plugin with the same `name` is already registered. |
| `runHook(hookName, ...args)` | Runs every handler registered for `hookName`, in registration order |
| `getDirective(name)` | Returns a custom directive handler registered via `api.addDirective`, or `undefined` |
| `getPlugins()` | Returns the names of all registered plugins |

`setup(api)` receives:

| `api` method | Registers a handler for |
|--------------|-------------------------|
| `addDirective(name, handler)` | a custom template directive |
| `onBeforeRender(fn)` | the `beforeRender` hook |
| `onAfterRender(fn)` | the `afterRender` hook |
| `onBeforeHydrate(fn)` | the `beforeHydrate` hook |
| `onAfterHydrate(fn)` | the `afterHydrate` hook |
| `onError(fn)` | the `error` hook |

```js
const registry = createPluginRegistry();

registry.register(definePlugin({
  name: 'analytics',
  setup(api) {
    api.onAfterHydrate(() => sendPageView());
  },
}));

registry.runHook('afterHydrate'); // fires the handler above
```

### Notes

- The registry does not call `runHook` on its own at render/hydrate time — a host integration is responsible for invoking each hook at the right point. Registering the plugin only wires up the handler.

## Lazy Hydration

Defers hydration of a subtree until it's needed. Browser-only — every function here reads DOM/browser APIs (`IntersectionObserver`, `requestIdleCallback`, `matchMedia`) that don't exist during SSR.

### `createLazyHydrator(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rootMargin` | `string` | `'0px'` | Forwarded to `IntersectionObserver` |
| `threshold` | `number` | `0` | Forwarded to `IntersectionObserver` |

Returns a controller:

| Method | Description |
|--------|-------------|
| `observe(element, hydrateFn)` | Watches `element`; calls `hydrateFn()` once when it intersects the viewport |
| `disconnect()` | Stops observing everything and clears the pending queue |
| `hydrateNow(element)` | Forces immediate hydration of a tracked element |
| `getPending()` | Number of elements still waiting |

### `lazyHydrate(element, hydrateFn, options?)`

Convenience wrapper: creates a `createLazyHydrator(options)` and immediately `observe()`s a single element. Returns the hydrator, so `disconnect()`/`hydrateNow()` remain available.

### `hydrateOnIdle(hydrateFn)`

Runs `hydrateFn` via `requestIdleCallback`, falling back to `setTimeout(fn, 0)` where it's unavailable. Returns a cancel function.

### `hydrateOnInteraction(element, hydrateFn, events?)`

Hydrates on the first of `events` (default `['click', 'focus', 'mouseenter']`) fired on `element`, then removes all the listeners. Returns a cleanup function that removes the listeners early.

### `hydrateOnMedia(hydrateFn, query)`

Hydrates immediately if `matchMedia(query).matches` is already true; otherwise waits for the query to start matching. Returns a cleanup function. Note the argument order: `hydrateFn` comes first, unlike the other `hydrateOn*` helpers.

```js
import { createLazyHydrator, hydrateOnInteraction } from '@basenative/runtime';

const hydrator = createLazyHydrator({ rootMargin: '200px' });
for (const card of document.querySelectorAll('[data-lazy]')) {
  hydrator.observe(card, () => hydrate(card, cardContext(card)));
}

hydrateOnInteraction(document.getElementById('comments'), () => {
  hydrate(document.getElementById('comments'), commentsContext);
});
```

### Notes

- `createLazyHydrator` falls back to hydrating immediately (synchronously, inside `observe()`) when `IntersectionObserver` is unavailable — there is no lazy behavior without it, only the same API shape.
- None of this module runs during SSR; call it from client-only code, typically after `hydrate()` has run for the eagerly-hydrated parts of the page.

## Web Vitals

Zero-dependency Core Web Vitals collection over `PerformanceObserver`. Every `observe*` function returns a cleanup function, or `null` when `PerformanceObserver` is unavailable (SSR, or an unsupporting browser) — always guard the return value before calling it.

### `observeLCP(callback)` / `observeFID(callback)` / `observeCLS(callback)` / `observeFCP(callback)` / `observeTTFB(callback)` / `observeINP(callback)`

Each observes one metric and calls `callback({ name, value, entries })` as new performance entries arrive:

| Function | `name` | `value` | Underlying entry type |
|----------|--------|---------|------------------------|
| `observeLCP` | `'LCP'` | `entry.startTime` | `largest-contentful-paint` |
| `observeFID` | `'FID'` | `entry.processingStart - entry.startTime` | `first-input` |
| `observeCLS` | `'CLS'` | running total of `entry.value` (entries with `hadRecentInput` are skipped) | `layout-shift` |
| `observeFCP` | `'FCP'` | `entry.startTime` | `paint`, filtered to `first-contentful-paint` |
| `observeTTFB` | `'TTFB'` | `entry.responseStart` | `navigation` |
| `observeINP` | `'INP'` | running max of `entry.duration` (only reports when a new max is seen) | `event` |

### `createVitalsReporter(options?)`

| Option | Type | Description |
|--------|------|-------------|
| `onReport` | `(metric) => void` | Called for every metric update from any observer |

Returns `{ start, stop, getMetrics }`:

| Method | Description |
|--------|-------------|
| `start()` | Starts all six observers above |
| `stop()` | Disconnects every observer started by `start()`; safe to call before `start()` or twice in a row |
| `getMetrics()` | Returns a snapshot (`{ LCP, FID, CLS, FCP, TTFB, INP }`) of the latest value seen for each metric so far |

```js
import { createVitalsReporter } from '@basenative/runtime';

const vitals = createVitalsReporter({
  onReport(metric) { navigator.sendBeacon('/vitals', JSON.stringify(metric)); },
});
vitals.start();
// later
vitals.stop();
```

### Notes

- Safe to call during SSR: `createObserver` checks `typeof PerformanceObserver === 'undefined'` and returns `null` instead of throwing, so every `observe*` function and `createVitalsReporter` no-op gracefully off the browser.

## Shared Expression Evaluator — `@basenative/runtime/shared/expression`

The CSP-safe expression evaluator used internally by both `hydrate()` (client) and `@basenative/server`'s `render()` (SSR) to evaluate template expressions such as `@if="isLoggedIn()"` or `{{ item.name }}`. Exposed as a subpath export — import it from `@basenative/runtime/shared/expression`, not the package root, which does not re-export this module.

No `eval`, no `new Function` — expressions are tokenized and parsed into a small AST, then walked by an interpreter with an explicit operation allowlist (Key Invariant #2 in `CLAUDE.md`).

### `compileExpression(source)`

Parses `source` into `{ source, ast }`, or `{ source, error }` on a syntax error. Cached by trimmed source string, so compiling the same expression twice returns the same object without re-parsing.

### `evaluateExpression(source, ctx?, options?)`

Compiles (if `source` is a string; a pre-compiled object from `compileExpression` is also accepted) and evaluates an expression against a context object. Returns `undefined` and reports a diagnostic through `options.onDiagnostic` instead of throwing, both on a compile error and on an evaluation-time error (for example touching a disallowed property).

### `clearExpressionCache()`

Empties the module-level compile cache. Mainly useful for tests or long-running processes that compile a very large number of distinct expressions.

### `isScopeSlot(value)`

Returns whether `value` is a "scope slot" — an object tagged with the `SCOPE_SLOT` symbol and exposing a `.get()` method, used internally to thread `@for` loop variables (`$index`, the loop item, …) through nested scopes.

### `SCOPE_SLOT`

The `Symbol.for('basenative.scopeSlot')` used to tag scope slots. Exported so a custom directive can produce its own scope-slot-compatible values.

```js
import { evaluateExpression } from '@basenative/runtime/shared/expression';

evaluateExpression('items.length > 0', { items: [1, 2] }); // true
evaluateExpression('user.__proto__', { user: {} });         // undefined — reports BN_EXPR_UNSAFE_MEMBER
```

### Notes

- Supported grammar: property/index access, method calls, arithmetic, comparison (`==`/`===`/`<`/…), logical (`&&`/`||`), ternary, array/object literals, unary `!`/`+`/`-`. No assignment, no loops, no `new`, no template literals.
- `__proto__`, `prototype`, and `constructor` are blocked on every member and computed access — including a computed key that arrives as a non-string, such as `x[["constructor"]]` — so this cannot be used to reach `Function` and execute arbitrary code. This is the security boundary the CSP-safe evaluator exists for; see Key Invariant #2 in `CLAUDE.md`.

## Output Escaping — `@basenative/runtime/shared/escape`

The escaping module shared by `hydrate()` and `@basenative/server`'s `render()`, so client and server agree on what's safe to emit — see the module header in `packages/runtime/src/shared/escape.js` for why this must not fork between the two. `raw` is also re-exported from the package root; every other function here is subpath-only.

### `raw(value)`

Marks `value` as trusted markup, exempt from HTML-escaping when interpolated.

```js
render('<div>{{ body }}</div>', { body: raw('<em>hi</em>') });
```

`raw()` does not exempt a value from the URL-scheme guard (`sanitizeUrl`) — a `javascript:` URL is stripped whether or not the value is marked raw.

### `isRaw(value)` / `unwrapRaw(value)`

`isRaw` returns whether `value` was produced by `raw()`. `unwrapRaw` returns the underlying string for a raw value, or `value` unchanged otherwise.

### `escapeText(value)`

Escapes `value` for insertion into a text node: `&`, `<`, `>`.

### `escapeAttr(value)`

Escapes `value` for a double-quoted attribute value: everything `escapeText` covers, plus `"` and `'`.

### `isUrlAttribute(name)`

Returns whether `name` (case-insensitive) is one of the attributes whose value is fetched or navigated to: `href`, `src`, `action`, `formaction`, `data`, `poster`, `xlink:href`, `ping`, `background`, `srcdoc`, `codebase`.

### `sanitizeUrl(value)`

Strips control characters and whitespace, then returns `null` if what remains starts with a `javascript:`, `vbscript:`, `data:`, `blob:`, or `file:` scheme. Returns the original value unchanged otherwise — this is a scheme guard, not an escaper.

### `findInterpolations(text)`

Returns every `{{ expression }}` found in `text` as `{ start, end, expression }`, scanning linearly with `indexOf` rather than a backtracking regex — the input is on the untrusted-input path (model-generated templates), where a `\{\{\s*(.+?)\s*\}\}` regex is quadratic on a long unclosed `{{`.

```js
import { escapeText, isUrlAttribute, sanitizeUrl } from '@basenative/runtime/shared/escape';

escapeText('<script>');             // '&lt;script&gt;'
isUrlAttribute('href');             // true
sanitizeUrl('javascript:alert(1)'); // null
sanitizeUrl('/safe/path');          // '/safe/path'
```

### Notes

- `escapeAttr`/`escapeText` do not themselves consult `isUrlAttribute`/`sanitizeUrl` — an attribute binding must call both: sanitize the URL first, then escape what's left for the attribute context. See `packages/runtime/src/bind.js` for the combined usage.
