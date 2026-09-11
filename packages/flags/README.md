# @basenative/flags

> Feature flags with percentage rollouts, rule-based targeting, and pluggable providers

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/flags
```

## Quick Start

```js
import { createFlagManager, createMemoryProvider } from '@basenative/flags';

const provider = createMemoryProvider({
  newDashboard: { enabled: true },
  betaSearch: { percentage: 20 },
  premiumFeature: {
    enabled: false,
    rules: [{ attribute: 'plan', value: 'pro', value: true }],
  },
});

const flags = createFlagManager(provider);

// Simple boolean check
const showNew = await flags.isEnabled('newDashboard'); // true

// Percentage rollout (consistent per userId)
const inBeta = await flags.isEnabled('betaSearch', { userId: 'user-42' });

// Get all flags for client hydration
const allFlags = await flags.getAll({ userId: 'user-42' });
```

## Server Middleware

```js
import { flagMiddleware } from '@basenative/flags';
import { createPipeline } from '@basenative/middleware';

const pipeline = createPipeline()
  .use(flagMiddleware(flags));
// ctx.state.flags is now an object of resolved flag values
```

## Template Directive: `@feature`

`@basenative/flags` registers a `@feature` template directive with `@basenative/runtime`'s directive registry as a side effect of importing this package — it works anywhere `render()` (SSR) or `hydrate()` (client) runs, with no extra wiring:

```html
<template @feature="newDashboard">
  <p>Try the new dashboard.</p>
</template>
<template @else>
  <p>Classic dashboard.</p>
</template>
```

`@feature` reads `ctx.$flags` from the render/hydrate context — a *synchronous* `{ isEnabled(name) }` object. `flagManager.isEnabled()` is async (it awaits the provider), while template rendering is synchronous end to end, so resolve every flag once, ahead of render, with `createFlagContext()`:

```js
import { createFlagManager, createMemoryProvider, createFlagContext } from '@basenative/flags';
import { render } from '@basenative/server';

const flags = createFlagManager(createMemoryProvider({ newDashboard: { enabled: true } }));
const $flags = await createFlagContext(flags, { userId: user.id });

const html = render(template, { ...data, $flags });
```

On the client, hydrate with the same shape — typically embedded from the server response (e.g. `$flags.flags`) and reconstructed as `{ isEnabled: (name) => Boolean(flags[name]) }`, or a live object if you want flags to react to change:

```js
import { hydrate } from '@basenative/runtime';

hydrate(root, { ...data, $flags: { isEnabled: (name) => window.__FLAGS__[name] } });
```

With no `$flags` on context, `@feature` treats the flag as disabled — it renders `@else` if present, otherwise nothing — and emits a `BN_FEATURE_NO_PROVIDER` diagnostic (via `options.onDiagnostic`) rather than guessing "enabled" for a flag it cannot evaluate. `flagName` is a literal flag name, not an expression — no quotes, unlike `@if`/`@switch`.

On a non-`<template>` element, `@feature="x"` is not control flow — like any other `@name` there, it becomes an event listener named `feature`, and `@basenative/validate` flags this as `BN_E_CONTROL_FLOW_ON_ELEMENT`.

### `createFlagContext(flagManager, context?)`

Resolves every flag once for `context` (same shape as `isEnabled`'s context) and returns a plain synchronous snapshot: `{ flags: Record<string, boolean>, isEnabled: (name) => boolean }`. Use its `isEnabled` on `ctx.$flags` for `@feature`.

## API

### `createFlagManager(provider, options?)`

Creates a flag evaluation manager. Options: `defaultValue` — value returned when a flag is not found (default: `false`).

Returns:

- `isEnabled(flagName, context?)` — Returns `Promise<boolean>`. Context fields like `userId` and `sessionId` are used for percentage rollout hashing.
- `getAll(context?)` — Returns `Promise<Record<string, boolean>>` with all flags resolved for the given context.
- `setFlag(flagName, config)` — Updates a flag's config if the provider supports writes.

### Flag Config Shape

```js
{
  enabled: true,                   // simple boolean
  percentage: 25,                  // % rollout, 0-100
  rules: [                         // rule-based targeting
    { attribute: 'plan', value: 'pro', result: true }
  ]
}
```

### Providers

- `createMemoryProvider(options)` — In-memory provider. Options: `flags` — initial flag config map.
  - `.getFlag(name)` — Returns a flag config.
  - `.getAllFlags()` — Returns all flag configs.
  - `.setFlag(name, config)` — Updates a flag config.
- `createRemoteProvider(options)` — Fetches flags from an HTTP endpoint. Options: `url`, `token`, `ttl` (cache TTL in ms).

### `flagMiddleware(flagManager, options?)`

Resolves all flags for the current request context and sets `ctx.state.flags`. Options: `getContext(ctx)` — function to extract the evaluation context from the request context.

## License

Apache-2.0
