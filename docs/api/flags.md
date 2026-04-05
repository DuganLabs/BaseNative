# @basenative/flags

> Feature flags with percentage rollouts, rule-based targeting, and pluggable providers.

## Overview

`@basenative/flags` lets you gate features behind flags without redeploying. Flags support simple boolean on/off, percentage-based rollouts (consistent per user ID or session), and rule-based targeting by user ID or role. An in-memory provider is included for development and testing. A remote provider fetches flags from an HTTP endpoint for runtime updates. The `flagMiddleware` attaches the flag manager to the request context so handlers can check flags without importing anything.

## Installation

```bash
npm install @basenative/flags
```

## Quick Start

```js
import {
  createFlagManager,
  flagMiddleware,
  createMemoryProvider,
} from '@basenative/flags';

const provider = createMemoryProvider({
  new_dashboard: { enabled: true },
  beta_feature:  { percentage: 20 },            // 20% rollout
  admin_tools:   { rules: [{ roles: ['admin'], value: true }] },
});

const flags = createFlagManager(provider);

// Direct check
const isOn = await flags.isEnabled('new_dashboard');

// With user context for percentage rollout
const seesFeature = await flags.isEnabled('beta_feature', { userId: 'user-42' });
```

## API Reference

### createFlagManager(provider, options)

Creates a feature flag manager backed by the given provider.

**Parameters:**
- `provider` — flag provider with `getFlag(name)` and `getAllFlags()` methods
- `options.defaultValue` — value returned when a flag is not found; default `false`

**Returns:** Flag manager object.

---

#### flagManager.isEnabled(flagName, context)

Checks whether a flag is enabled for the given context.

**Parameters:**
- `flagName` — flag name string
- `context` — object with optional `userId`, `sessionId`, `role` fields

**Returns:** `Promise<boolean>`

**Evaluation order:**
1. Simple boolean: returns `flag.enabled` if no `rules` or `percentage`
2. Percentage rollout: hashes `userId` or `sessionId` deterministically; returns `true` if the hash falls within the percentage
3. Rule-based: iterates `flag.rules` and returns the first matching rule's `value`
4. Falls back to `flag.enabled` or `defaultValue`

**Example:**
```js
// 20% rollout — same user always gets the same result
await flags.isEnabled('beta_ui', { userId: 'usr_123' });

// Role-based
await flags.isEnabled('admin_tools', { userId: 'usr_456', role: 'admin' });
```

---

#### flagManager.getAll(context)

Returns a map of all flag names to their evaluated boolean values for the given context.

**Parameters:**
- `context` — same shape as `isEnabled` context

**Returns:** `Promise<Record<string, boolean>>`

Useful for bootstrapping client-side flag state in a single server response.

---

#### flagManager.setFlag(flagName, config)

Sets or updates a flag configuration (if the provider supports mutation).

**Parameters:**
- `flagName` — flag name string
- `config` — flag configuration object

---

### flagMiddleware(flagManager)

Middleware that attaches the flag manager to `ctx.state`.

**Parameters:**
- `flagManager` — flag manager from `createFlagManager`

**Returns:** Middleware function.

After this middleware runs:
- `ctx.state.flags` — the flag manager instance
- `ctx.state.isEnabled(name)` — async shortcut that evaluates flags using the current request's user and session context

**Example:**
```js
import { createPipeline } from '@basenative/middleware';
import { flagMiddleware } from '@basenative/flags';

const pipeline = createPipeline()
  .use(sessionMiddleware(sessions))
  .use(flagMiddleware(flags));

// In a route handler:
if (await ctx.state.isEnabled('new_checkout')) {
  // render new checkout
}
```

---

### createMemoryProvider(initialFlags)

In-memory flag provider. Flag values can be updated at runtime via `setFlag`.

**Parameters:**
- `initialFlags` — object mapping flag names to flag config objects

**Returns:** Provider object with `getFlag`, `getAllFlags`, `setFlag`, `deleteFlag`.

**Flag config shape:**
```js
{
  enabled: boolean,        // simple on/off
  percentage: number,      // 0–100 rollout percentage
  rules: [                 // targeting rules (evaluated in order)
    {
      userIds: ['usr_1'],  // specific user IDs
      roles: ['admin'],    // specific roles
      condition: (ctx) => boolean,  // custom function
      value: true,         // value to return when this rule matches
    }
  ],
}
```

---

### createRemoteProvider(options)

Fetches flags from an HTTP endpoint. Supports polling for updates.

**Parameters:**
- `options.url` — endpoint URL that returns `Record<string, FlagConfig>` as JSON
- `options.headers` — additional request headers (e.g. for auth tokens)
- `options.pollInterval` — polling interval in ms; default no polling

**Returns:** Provider object with `getFlag`, `getAllFlags`.

## Integration

Register `flagMiddleware` after `sessionMiddleware` in the `@basenative/middleware` pipeline so that `ctx.state.isEnabled` has access to the current user and session. Use `createMemoryProvider` in tests and switch to `createRemoteProvider` in production for runtime flag updates without redeployment.
