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
  flags: {
    newDashboard: { enabled: true },
    betaSearch: { percentage: 20 },
    premiumFeature: {
      enabled: false,
      rules: [{ attribute: 'plan', value: 'pro', value: true }],
    },
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

MIT
