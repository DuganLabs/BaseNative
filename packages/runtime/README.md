# @basenative/runtime

> Signal-based reactive runtime for native HTML — zero build step, zero production dependencies

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/runtime
```

## Quick Start

```js
import { signal, computed, effect, hydrate } from '@basenative/runtime';

// Create reactive state
const count = signal(0);
const doubled = computed(() => count() * 2);

// React to changes
effect(() => {
  console.log(`count: ${count()}, doubled: ${doubled()}`);
});

count.set(5); // logs: count: 5, doubled: 10

// Hydrate server-rendered HTML with signal bindings
hydrate(document.body, { count });
```

## API

### Signals

- `signal(initial)` — Creates a readable/writable reactive value. Call it to read (`count()`), use `.set(value)` to write, `.peek()` to read without tracking.
- `computed(fn)` — Creates a derived signal that re-evaluates when its dependencies change. Lazy with automatic dependency tracking.
- `effect(fn)` — Runs `fn` immediately and re-runs whenever any signal read inside changes. Returns a `dispose` function to stop tracking.
- `batch(fn)` — Groups signal writes inside `fn` into a single effect flush instead of one flush per write. Nests; only the outermost call flushes.
- `registerPlugin(plugin)` — Registers a global `{ onSignalWrite(signal, prev, next) }` hook that observes every signal write. Returns an unregister function. Distinct from the `definePlugin`/`createPluginRegistry` lifecycle system below.

### Hydration

- `hydrate(root, ctx)` — Attaches signal reactivity to server-rendered HTML. Reads `<!--bn:*-->` markers emitted by `@basenative/server`.

### Browser Features

- `browserFeatures` — Signal containing detected browser capability flags.
- `detectBrowserFeatures()` — Runs feature detection and updates `browserFeatures`.
- `supportsFeature(name)` — Returns true/false for a named capability.

### Diagnostics & DevTools

- `emitDiagnostic(diagnostic)` — Emit a structured runtime diagnostic.
- `reportHydrationMismatch(info)` — Report a server/client HTML mismatch.
- `enableDevtools()` / `disableDevtools()` / `isDevtoolsEnabled()` — Toggle the BaseNative devtools panel.
- `trackSignal(signal)` / `trackEffect(effect)` / `recordHydration(info)` — DevTools instrumentation hooks.

### Debug Mode

- `enableDebug(options)` / `disableDebug()` / `isDebugEnabled()` — Toggle verbose console logging for signal/effect activity. Zero overhead when off.
- `getDebugStats()` — Returns a snapshot of counters (`signalsCreated`, `effectsCreated`, `signalWrites`, `signalReads`, `effectRuns`).
- `debugSignal(signal, name)` / `debugEffect(fn, name)` — Wrap a signal or effect so its activity is logged.
- `debugTime(label, fn)` — Times and logs a synchronous call; still runs `fn` and returns its result when debug mode is off.
- `debugAssert(condition, message)` — Throws when `condition` is false and debug mode is on; a full no-op when off.
- `debugDeps(signal, name)` — Logs a signal's current value; a no-op when debug mode is off.

### Error Boundaries

- `createErrorBoundary(options)` — Creates a reusable boundary (`{ onError, fallback }`) with `try(fn)` / `getError()` / `hasError()` / `getFallback()` / `reset()`. Catches rendering errors and exposes a fallback.
- `renderWithBoundary(renderFn, options)` — One-shot version for a single render call; same `{ onError, fallback }` options, no reusable boundary object. Falls back to an HTML comment when no `fallback` is given.

### Plugins

- `definePlugin(plugin)` — Register a runtime plugin with lifecycle hooks.
- `createPluginRegistry()` — Creates an isolated plugin registry.

### Lazy Hydration

- `lazyHydrate(el, fn)` — Hydrates an element on demand.
- `hydrateOnIdle(el, fn)` — Hydrates when the browser is idle via `requestIdleCallback`.
- `hydrateOnInteraction(el, fn)` — Hydrates on first user interaction with the element.
- `hydrateOnMedia(fn, query)` — Hydrates when a CSS media query matches. Note: `fn` comes first, unlike the other `hydrateOn*` helpers.
- `createLazyHydrator(options)` — Creates a lazy hydration controller with shared options.

### Web Vitals

- `createVitalsReporter(options)` — Creates a reporter that sends Core Web Vitals to an endpoint.
- `observeLCP(cb)` / `observeFID(cb)` / `observeCLS(cb)` / `observeFCP(cb)` / `observeTTFB(cb)` / `observeINP(cb)` — Observe individual Web Vital metrics. Each returns a cleanup function, or `null` when `PerformanceObserver` is unavailable (e.g. during SSR).

### Shared Utilities (subpath exports)

- `raw(value)` — Marks a string as trusted markup, exempt from HTML-escaping. Also available from the package root.
- `@basenative/runtime/shared/escape` — `isRaw`, `unwrapRaw`, `escapeText`, `escapeAttr`, `isUrlAttribute`, `sanitizeUrl`, `findInterpolations`. The output-escaping primitives shared with `@basenative/server`.
- `@basenative/runtime/shared/expression` — `compileExpression`, `evaluateExpression`, `clearExpressionCache`, `isScopeSlot`, `SCOPE_SLOT`. The CSP-safe expression evaluator shared with `@basenative/server`; see `docs/api/runtime.md` for the full API and its security constraints.

## License

Apache-2.0
