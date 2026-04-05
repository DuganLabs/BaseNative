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

### Error Boundaries

- `createErrorBoundary(options)` — Creates a boundary that catches rendering errors and renders a fallback.
- `renderWithBoundary(fn, boundary)` — Wraps a render call with an error boundary.

### Plugins

- `definePlugin(plugin)` — Register a runtime plugin with lifecycle hooks.
- `createPluginRegistry()` — Creates an isolated plugin registry.

### Lazy Hydration

- `lazyHydrate(el, fn)` — Hydrates an element on demand.
- `hydrateOnIdle(el, fn)` — Hydrates when the browser is idle via `requestIdleCallback`.
- `hydrateOnInteraction(el, fn)` — Hydrates on first user interaction with the element.
- `hydrateOnMedia(el, fn, query)` — Hydrates when a CSS media query matches.
- `createLazyHydrator(options)` — Creates a lazy hydration controller with shared options.

### Web Vitals

- `createVitalsReporter(options)` — Creates a reporter that sends Core Web Vitals to an endpoint.
- `observeLCP(cb)` / `observeFID(cb)` / `observeCLS(cb)` / `observeFCP(cb)` / `observeTTFB(cb)` / `observeINP(cb)` — Observe individual Web Vital metrics.

## License

MIT
