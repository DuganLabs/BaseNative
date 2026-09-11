# @basenative/integrations

> Headless third-party integration wrappers for BaseNative apps — Plaid Link + accounts/transfers, and pure float-yield optimization math

Part of the [BaseNative](https://github.com/DuganLabs/BaseNative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/integrations
```

Each subpath is a separate entry point — import only what you need:

```js
import { createPlaidLink, createPlaidClient } from '@basenative/integrations/plaid';
import { findBestYieldAccount, optimizeFloatAllocation } from '@basenative/integrations/yield';
```

## Quick Start

### Plaid Link (client-side)

```js
import { createPlaidLink } from '@basenative/integrations/plaid';
import { signal } from '@basenative/runtime';

const { linkStatus, open, destroy } = await createPlaidLink({
  token: linkToken, // from createLinkToken() below, fetched from your server
  onSuccess: (publicToken, metadata) => {
    // send publicToken to your server to exchange it
  },
  signals: { signal },
});

open(); // launches the Plaid Link UI; linkStatus updates as the user completes it
```

### Plaid accounts + transfers (server-side)

```js
import { createLinkToken, exchangePublicToken, createPlaidClient } from '@basenative/integrations/plaid';

const credentials = { clientId: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, env: 'sandbox' };

const { linkToken } = await createLinkToken({ userId: 'user_123' }, credentials);
const { accessToken } = await exchangePublicToken(publicTokenFromClient, credentials);

const plaid = createPlaidClient({ clientId: credentials.clientId, secret: credentials.secret, environment: credentials.env });
const { accounts } = await plaid.getAccounts(accessToken);
```

### Yield optimization (pure functions, no network calls)

```js
import { findBestYieldAccount, optimizeFloatAllocation } from '@basenative/integrations/yield';

const best = findBestYieldAccount([
  { id: 'a1', name: 'Checking', balance: 5000, apy: 0.005 },
  { id: 'a2', name: 'High-yield savings', balance: 20000, apy: 0.045 },
]);
// { accountId: 'a2', accountName: 'High-yield savings', apy: 0.045, expectedMonthlyYield: 75 }
```

## API

### `@basenative/integrations/plaid`

Client-side (requires a browser):

- `loadPlaidScript()` — Loads the Plaid Link drop-in script once; resolves when ready.
- `createPlaidLink(config)` — Signal-based Link handler. `config`: `token`, `onSuccess(publicToken, metadata)`, `onExit?`, `onEvent?`, `signals` (an object exposing `signal()`, e.g. `@basenative/runtime`). Returns `{ linkToken, linkStatus, open(), destroy() }` — `linkToken`/`linkStatus` are signals when `signals.signal` is provided, `null` otherwise.
- `openPlaidLink(options)` — Lower-level Link handler without signals. `options`: `token`, `onSuccess`, `onExit?`, `onEvent?`. Returns `{ open(), destroy() }`.

Server-side (Node.js or Cloudflare Workers — uses `fetch`, no SDK):

- `createPlaidClient(config)` — Factory bundling credentials into `exchangePublicToken`, `getAccounts`, `getBalance`, `createTransfer`, `getTransferStatus`. `config`: `clientId`, `secret`, `environment?` (`'sandbox'` | `'development'` | `'production'`, default `'sandbox'`).
- `createLinkToken(options, credentials)` — Creates a Link token. `options`: `userId`, `clientName?`, `products?` (default `['transactions']`), `countryCodes?` (default `['US']`), `language?`. Returns `{ linkToken, expiration, requestId }`.
- `exchangePublicToken(publicToken, credentials)` — Exchanges a Link `onSuccess` public token for an access token. Returns `{ accessToken, itemId, requestId }`.
- `getAccounts(accessToken, credentials)` — Fetches linked accounts without balances.
- `getBalances(accessToken, credentials)` / `getBalance(accessToken, credentials)` — Fetches accounts with balances (`getBalance` is an alias).
- `createTransfer(params, credentials)` — Initiates a Plaid Transfer. `params`: `accessToken`, `accountId`, `type` (`'debit'` | `'credit'`), `amount` (cents), `description`, `network?` (`'rtp'` for RTP/FedNow, falls back to ACH on failure), `user?` (`{ name, email }`). Returns `{ transferId, status, network }`.
- `getTransferStatus(transferId, credentials)` — Returns `{ transferId, status, amount, network }`.

`credentials` is always `{ clientId, secret, env? }`. All server functions call the Plaid REST API directly via `fetch` — no `plaid` npm SDK dependency.

### `@basenative/integrations/yield`

Pure functions — no external API calls, no I/O:

- `findBestYieldAccount(accounts)` — Picks the highest-APY account from `[{ id, name, balance, apy }]`. Returns `{ accountId, accountName, apy, expectedMonthlyYield }`.
- `optimizeFloatAllocation(accounts, totalFloat)` — Greedily allocates `totalFloat` across accounts (highest APY first, respecting each account's optional `maxBalance`). Returns `[{ accountId, accountName, allocation, expectedYield }]`.
- `calculateOptimalTransferTiming(liabilities, accounts)` — Builds a transfer schedule that keeps float in the best-yield account until 2 days before each liability's due date. Returns `[{ transferDate, fromAccountId, amount, reason }]`.
- `calculateBreakEven(amount, fromApy, toApy, transferCostCents?, daysFloat?)` — Determines whether moving `amount` (cents) from one APY to a higher one is worth a fixed transfer cost over `daysFloat` days. Returns `{ profitable, yieldGain, breakEvenDays }`.

## Tests

```bash
cd packages/integrations && node --test
```

## License

Apache-2.0
