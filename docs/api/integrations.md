# @basenative/integrations

> Headless third-party integration wrappers for BaseNative apps.

## Overview

`@basenative/integrations` wraps third-party financial APIs behind small, framework-agnostic functions so BaseNative apps don't have to hand-roll SDK glue. Today that means a Plaid Link + Plaid API wrapper (client-side Link initialization plus server-side account/balance/transfer calls) and a set of pure functions for float-yield optimization across linked accounts.

This package has **no root export** — `package.json`'s `exports` map only defines `./plaid` and `./yield`. There is no `import ... from '@basenative/integrations'`; every import must use one of the two subpaths shown below.

## Installation

```bash
npm install @basenative/integrations
```

## Quick Start

```js
// Client: initialize Plaid Link
import { createLinkToken } from '@basenative/integrations/plaid'; // called server-side
import { createPlaidLink } from '@basenative/integrations/plaid'; // called client-side

const { linkToken } = await createLinkToken(
  { userId: 'user_123' },
  { clientId: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, env: 'sandbox' },
);

const link = await createPlaidLink({
  token: linkToken,
  onSuccess: (publicToken, metadata) => sendToServer(publicToken, metadata),
});
link.open();

// Yield: pick the best account for idle float
import { findBestYieldAccount } from '@basenative/integrations/yield';

const best = findBestYieldAccount([
  { id: 'acc_1', name: 'Checking', balance: 500000, apy: 0.005 },
  { id: 'acc_2', name: 'Treasury MMF', balance: 500000, apy: 0.045 },
]);
```

## Plaid (./plaid)

Client-side Link initialization is signal-optional — pass a `signals` object (e.g. from `@basenative/runtime`) to get reactive `linkToken`/`linkStatus` state, or omit it and just use the returned `open()`/`destroy()` handles. Server-side functions call the Plaid REST API directly with `fetch` and work equally in Cloudflare Workers and Node.js.

### loadPlaidScript()

Loads the Plaid Link drop-in script (`link-initialize.js` from Plaid's CDN) into the page if it isn't already present. Safe to call multiple times — an in-flight or already-loaded script is detected and reused.

**Parameters:** none.

**Returns:** `Promise<void>` — resolves once `window.Plaid` is available. Rejects if called outside a browser (`typeof window === 'undefined'`) or if the script fails to load.

---

### createPlaidLink(config)

Creates a signal-based Plaid Link handler. This is the primary client-side entry point — it loads the Link script, calls `window.Plaid.create(...)`, and (optionally) wires the resulting state into signals.

**Parameters:**
- `config.token` — Link token from `createLinkToken()`
- `config.onSuccess(publicToken, metadata)` — called when the user completes Link
- `config.onExit(err, metadata)` — optional; called when the user exits Link
- `config.onEvent(eventName, metadata)` — optional; called on Link lifecycle events
- `config.signals` — optional object exposing a `signal()` function (e.g. `@basenative/runtime`); when provided, `linkToken` and `linkStatus` are returned as live signals instead of `null`

**Returns:** `Promise<{ linkToken, linkStatus, open, destroy }>` — `linkToken`/`linkStatus` are signals (or `null` if `config.signals` wasn't passed); `open()` opens the Link flow, `destroy()` tears down the handler.

---

### openPlaidLink(options)

Opens Plaid Link with a given link token. This is the legacy, non-signal API — prefer `createPlaidLink()` for new code; `openPlaidLink()` is kept for callers that don't need signal-based state.

**Parameters:**
- `options.token` — Link token from `createLinkToken()`
- `options.onSuccess(publicToken, metadata)`
- `options.onExit(err, metadata)` — optional
- `options.onEvent(eventName, metadata)` — optional

**Returns:** `Promise<{ open: () => void, destroy: () => void }>`

---

### createPlaidClient(config)

Creates a bound Plaid API client — a small factory over the module's standalone request functions so you don't have to thread `credentials` through every call. Works in Cloudflare Workers and Node.js.

**Parameters:**
- `config.clientId`
- `config.secret`
- `config.environment` — `'sandbox'` (default), `'development'`, or `'production'`

**Returns:** object with bound methods: `exchangePublicToken(publicToken)`, `getAccounts(accessToken)`, `getBalance(accessToken)`, `createTransfer(params)`, `getTransferStatus(transferId)`.

---

### createLinkToken(options, credentials)

Creates a Plaid Link token for client-side Link initialization. Call this from a server route; hand the returned `linkToken` to `createPlaidLink()`/`openPlaidLink()`.

**Parameters:**
- `options.userId` — your app's user ID (mapped to `client_user_id`)
- `options.clientName` — display name shown in the Link UI; default `'BaseNative App'`
- `options.products` — Plaid products array; default `['transactions']`
- `options.countryCodes` — default `['US']`
- `options.language` — default `'en'`
- `credentials.clientId`, `credentials.secret`, `credentials.env` (default `'sandbox'`)

**Returns:** `Promise<{ linkToken: string, expiration: string, requestId: string }>`

---

### exchangePublicToken(publicToken, credentials)

Exchanges a public token (received in Link's `onSuccess`) for a long-lived access token.

**Parameters:**
- `publicToken` — the public token from Plaid Link
- `credentials` — `{ clientId, secret, env }`

**Returns:** `Promise<{ accessToken: string, itemId: string, requestId: string }>`

---

### getAccounts(accessToken, credentials)

Fetches linked accounts without balance details.

**Parameters:**
- `accessToken` — from `exchangePublicToken()`
- `credentials` — `{ clientId, secret, env }`

**Returns:** `Promise<{ accounts: Array<{ id, name, type, subtype }> }>`

---

### getBalances(accessToken, credentials)

Fetches account balances for a linked item.

**Parameters:** same as `getAccounts`.

**Returns:** `Promise<{ accounts: Array<{ id, name, type, subtype, balances: { available, current, limit, currency } }> }>`

---

### getBalance(accessToken, credentials)

Alias for `getBalances()`, kept for naming consistency with `getAccounts` (singular vs. the plural REST resource). Identical signature and return shape.

---

### createTransfer(params, credentials)

Initiates a transfer via the Plaid Transfer API. Supports RTP/FedNow instant transfers (`network: 'rtp'`) with automatic fallback to ACH: if Plaid rejects the RTP request with `INVALID_REQUEST`, the call is retried without the `network` field (ACH).

**Parameters:**
- `params.accessToken` — access token for the source account
- `params.accountId` — account to transfer from
- `params.type` — `'debit'` or `'credit'`
- `params.amount` — amount in cents (converted to dollars for the Plaid request)
- `params.description` — transfer description; default `'Transfer via PendingBusiness'`
- `params.network` — `'rtp'` to request FedNow/RTP; omit to let Plaid auto-select (effectively ACH)
- `params.user` — optional `{ name, email }`
- `credentials` — `{ clientId, secret, env }`

**Returns:** `Promise<{ transferId: string, status: string, network: string }>` — `network` reflects what actually happened (`'ach'` if the RTP attempt fell back).

---

### getTransferStatus(transferId, credentials)

Checks the status of a transfer created with `createTransfer()`.

**Parameters:**
- `transferId` — transfer ID from `createTransfer()`
- `credentials` — `{ clientId, secret, env }`

**Returns:** `Promise<{ transferId: string, status: string, amount: number, network: string }>`

## Yield (./yield)

Pure, synchronous math for idle-float management — no network calls, no dependency on the Plaid module. Accounts are plain objects you supply (typically populated from `getAccounts`/`getBalances`).

### findBestYieldAccount(accounts)

Finds the account with the highest APY and estimates its monthly yield at the current balance.

**Parameters:**
- `accounts` — `Array<{ id, name, balance, apy }>`; throws if empty/absent

**Returns:** `{ accountId, accountName, apy, expectedMonthlyYield }`

---

### optimizeFloatAllocation(accounts, totalFloat)

Greedily allocates `totalFloat` across accounts, filling the highest-APY accounts first up to each account's `maxBalance` (default unlimited).

**Parameters:**
- `accounts` — `Array<{ id, name, balance, apy, maxBalance? }>`; throws if empty
- `totalFloat` — total amount to allocate; throws if negative

**Returns:** `Array<{ accountId, accountName, allocation, expectedYield }>` — one entry per account that received an allocation, in descending-APY order.

---

### calculateOptimalTransferTiming(liabilities, accounts)

Builds a transfer schedule that keeps float in the best-yield account (per `findBestYieldAccount`) until shortly before it's needed. Each liability is scheduled 2 days before its due date.

**Parameters:**
- `liabilities` — `Array<{ dueDate: Date, amount: number, description? }>`; returns `[]` if empty
- `accounts` — `Array<{ id, name, currentBalance, apy }>`; throws if empty

**Returns:** `Array<{ transferDate: Date, fromAccountId: string, amount: number, reason: string }>`, sorted by due date.

---

### calculateBreakEven(amount, fromApy, toApy, transferCostCents = 0, daysFloat = 30)

Determines whether moving `amount` from a lower-APY account to a higher-APY one is worth a given transfer cost, given how long the money will sit in the destination account.

**Parameters:**
- `amount` — amount to transfer, in cents
- `fromApy`, `toApy` — source/destination APY; if `toApy <= fromApy` the result is immediately unprofitable
- `transferCostCents` — fixed transfer cost; default `0`
- `daysFloat` — days the money remains in the destination account; default `30`

**Returns:** `{ profitable: boolean, yieldGain: number, breakEvenDays: number }` — `yieldGain` is net of transfer cost over `daysFloat`; `breakEvenDays` is `Infinity` when not profitable.

## Integration

Server-side Plaid calls (`createLinkToken`, `exchangePublicToken`, `getAccounts`, `getBalances`, `createTransfer`, `getTransferStatus`) are plain `fetch`-based REST calls with no platform-specific APIs, so `createPlaidClient()` works unmodified in both Cloudflare Workers routes and Node.js servers. Client-side functions (`createPlaidLink`, `openPlaidLink`, `loadPlaidScript`) require a browser `window`/`document` and are not usable during SSR.

## License

Apache-2.0
