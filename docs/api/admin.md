# @basenative/admin

> Pluggable admin & moderation surface — protected-route helpers, role/permission primitives, audit-log middleware, and queue-review UI components for BaseNative apps.

## Overview

`@basenative/admin` provides the pieces needed to build a moderation queue and admin panel on top of a BaseNative app: a small hierarchical role system (`user` < `moderator` < `admin` by default, fully configurable), a generic submit/review/approve queue bound to any DB exposing a D1-shaped `prepare(sql).bind(...).all()/first()/run()` port, an audit-log recorder for protected actions, drop-in CF Worker/Pages Function handlers that wire roles, queue, and audit together, and dependency-free HTML-string UI components for the queue and user-management screens. Each concern is its own subpath export (`./roles`, `./queue`, `./audit`, `./handlers`, `./components`) so an app that only needs role checks doesn't pull in the queue or component code. A SQL migration is shipped at `./migrations/0001` (`migrations/0001_audit_and_roles.sql`) — it creates the `audit_log` table (with indexes on `actor_id`, `action`, `target_type`+`target_id`, and `created_at`), a `submissions` queue table (with indexes on `status`+`created_at` and `submitted_by`), an index on `users(role)`, and commented-out `ALTER TABLE` statements for adding a `role` column to an existing `users` table.

## Installation

```bash
npm install @basenative/admin
```

## Quick Start

```js
import { defineRoles } from '@basenative/admin/roles';
import { defineQueue } from '@basenative/admin/queue';
import { defineAdminHandlers } from '@basenative/admin/handlers';

const roles = defineRoles({ hierarchy: ['user', 'moderator', 'admin'] });

const queue = defineQueue({
  db: env.DB,
  tables: { submissions: 'submissions', target: 'phrases', columns: ['category', 'phrase'] },
});

const admin = defineAdminHandlers({
  queue,
  roles,
  users: usersPort, // your own { getById, setRole, search, listByRoles } port
  getCurrentUser: (request, env) => getSessionUser(request, env),
});

// route file — see the note on onRequestGet/onRequestPost below
export const onRequestGet = admin.listPending;
export const onRequestPost = admin.decide;
```

## API Reference

## Roles (./roles)

Generic, hierarchical, zero-dependency role primitives. A higher-tier role implicitly has every permission of the tiers below it. For verb-style permissions (`posts.write`) reach for `@basenative/auth`'s RBAC instead — this module is purpose-built for the common moderation case of a small ordered role ladder.

### defineRoles(opts = {})

Build a role checker from a hierarchy.

**Parameters:**
- `opts.hierarchy` — roles ordered least → most privileged; default `['user', 'moderator', 'admin']`
- `opts.adminRole` — top-tier role name; default: last entry in `hierarchy`
- `opts.moderatorRole` — default: `'moderator'` if present in `hierarchy`, else `null`
- `opts.defaultRole` — role assumed when a user has none; default: first entry in `hierarchy`

Throws `TypeError` if `hierarchy` isn't a non-empty array.

**Returns:** a `RoleChecker` object:
- `hierarchy` — copy of the resolved hierarchy
- `getRole(user)` — reads `user.role`, falling back to `defaultRole`
- `hasRole(user, role)` — true if the user's rank is ≥ `role`'s rank
- `rank(role)` — 0-based rank, or `-1` if unknown
- `isAdmin(user)` / `isModerator(user)` — convenience checks for the top tier / the configured moderator tier
- `requireRole(role)` — returns a `(user) => boolean` predicate

---

### hasRole(user, role, hierarchy = ['user', 'moderator', 'admin'])

Pure helper — check a role against any hierarchy without building a checker via `defineRoles`.

**Returns:** `boolean`

---

### requireRole(role, opts = {})

Build a guard that throws (or returns a 403-shaped object) when the supplied user does not satisfy the required role. Matches the t4bs / CF-Pages convention: handlers return `{ user }` on success or `{ error: Response }` on failure.

**Parameters:**
- `role` — minimum role required
- `opts.hierarchy` — passed through to `defineRoles`
- `opts.onDenied(role)` — default returns a `403` JSON `Response` shaped `{ error: '<role>-only' }`

**Returns:** `(user) => { user } | { error: any }`

---

### roleSeed({ env, envKey = 'ADMIN_HANDLES', user, seedMap, identifier = (u) => u?.handle, targetRole = 'admin', setRole })

Seed an elevated role for a user when a deployment-time allowlist matches. Mirrors `seedAdminRole` in t4bs: when a user's identifier (by default `user.handle`) appears in `seedMap` or in the comma-separated `env[envKey]` list, their role is promoted on first sight via `setRole`, which is left to the caller so this stays storage-agnostic. Matching is case-insensitive.

**Parameters:**
- `env` — deployment env object (read via `env[envKey]`), or the raw comma-separated allowlist string itself
- `envKey` — env var name to consult; default `'ADMIN_HANDLES'`
- `user` — the just-loaded user record
- `seedMap` — optional explicit `{ identifier: role }` map; wins over `env` when the identifier is present
- `identifier(user)` — default `u => u?.handle`
- `targetRole` — role to seed when matched; default `'admin'`
- `setRole(userId, role, by)` — required DB writer, invoked as `setRole(user.id, targetRole, 'seed:' + envKey)`

**Returns:** `Promise<any>` — the user unchanged, or `{ ...user, role: targetRole }` if promoted. No-ops (returns `user` as-is) if `user` is falsy, already at `targetRole`, `setRole` isn't a function, or no identifier/match is found.

## Queue (./queue)

A generic implementation of a submit → pending → decide → promote-to-target flow. The queue lives in a `submissions` table (or whatever you point it at); on approval the row is copied into a `target` table, on rejection it's left in place with decision metadata. The `db` argument is a thin port — anything exposing `prepare(sql).bind(...).all()/first()/run()` (matching `@basenative/db` and Cloudflare D1) works. Table and column names are validated as plain SQL identifiers before being interpolated into SQL.

### defineQueue({ db, tables, now = () => Date.now(), onApprove } = {})

Build a queue store bound to a DB and a pair of tables.

**Parameters:**
- `db` — object exposing `prepare()`; throws `TypeError` otherwise
- `tables.submissions` — submissions table name (required)
- `tables.target` — approved-row destination table name (required)
- `tables.columns` — columns copied from submission → target on approval; default `['category', 'phrase']`
- `now()` — clock override, mainly for tests; default `Date.now`
- `onApprove(row, { db })` — optional async hook run instead of the default copy-to-target insert when a submission is approved

**Returns:** a queue store object:

#### queue.listPending(limit = 50)
Lists rows with `status = 'pending'`, oldest first. `limit` is clamped to `1..500`.

#### queue.submit(payload)
Inserts a new pending submission. `payload.submittedBy` is required (trimmed, throws `TypeError` if empty); `payload` must also supply each column named in `tables.columns`. Returns `{ id, status: 'pending', submittedBy, createdAt }`.

#### queue.decide(id, status, decidedBy)
Decides a pending submission — `status` must be `'approved'` or `'rejected'` (throws `TypeError` otherwise). On approval, copies the row's `tables.columns` into `tables.target` (or calls `onApprove(row, { db })` if supplied) inside the same decide call. Returns `{ id, status, decidedBy, decidedAt }`, or `null` if no pending row matched `id`.

#### queue.get(id)
Reads a single submission row by id.

## Audit (./audit)

Records every protected action against an `audit_log` table so admin decisions, role changes, and queue moves are reconstructible after the fact. Designed to wrap a handler or be invoked imperatively.

### auditAction(env, entry)

Record an audit entry. Never throws into the caller — a DB failure is caught and logged via `console.warn` so audit logging can't break the main request flow.

**Parameters:**
- `env` — worker env (read via `env.DB`), or the DB binding itself
- `entry.action` — required action string, e.g. `'submission.approved'`
- `entry.user` — `{ id?, handle? }`, both optional
- `entry.target` — `{ type?, id? }`, optional
- `entry.meta` — arbitrary object, JSON-stringified into `meta_json`
- `entry.table` — table name override; default `'audit_log'` (validated as a plain identifier)
- `entry.now()` — clock override; default `Date.now`

**Returns:** `Promise<void>`

---

### withAudit(cfg)

Wrap a request handler so every successful invocation records an audit entry. The wrapper resolves `user`, `action`, `target`, and `meta` from the supplied callbacks at call time so they can read from the request/response.

**Parameters:**
- `cfg.action` — string, or `(ctx) => string`
- `cfg.user(ctx)` — required, resolves the acting user
- `cfg.target?(ctx)` — resolves `{ type?, id? }`
- `cfg.meta?(ctx, result)` — resolves arbitrary metadata
- `cfg.shouldRecord?(ctx, result)` — gate recording per-call; default always records
- `cfg.table` — passed through to `auditAction`

**Returns:** `(handler) => (ctx) => Promise<any>` — a decorator that calls `handler(ctx)`, records the audit (swallowing any audit error), and returns the handler's result unchanged.

---

### AUDIT_MIGRATION

SQL migration text (string) for just the `audit_log` table and its four indexes — the same statements as the `audit_log` portion of `migrations/0001_audit_and_roles.sql`, re-exported here for convenience when you want to apply it programmatically (e.g. in a worker startup hook) rather than through a migration file. It does **not** include the `submissions` table or the `users(role)` index that the full `./migrations/0001` file also creates.

## Handlers (./handlers)

Drop-in CF Worker / Pages Function handlers for the admin & moderation surface. The handlers are generic over a role checker (`./roles`), a queue store (`./queue`), a "current user" resolver (e.g. from `@basenative/auth`), and a users-table port you implement for the promote/search endpoints.

### defineAdminHandlers(cfg)

**Parameters:**
- `cfg.queue` — a store from `defineQueue` (required)
- `cfg.getCurrentUser(request, env)` — resolves the current user, or `null` (required)
- `cfg.users` — `{ getById, setRole, search, listByRoles }` port; `users`/`promote` return `501` without it
- `cfg.roles` — a checker from `defineRoles`; default `defineRoles()`
- `cfg.validateRoles` — allowed roles for `promote`; default: `cfg.roles.hierarchy`

Throws `TypeError` if `cfg.queue` or `cfg.getCurrentUser` is missing.

**Returns:** an object of handlers, each `async ({ request, env }) => Response`:

#### admin.listPending
`GET /api/moderate/pending` — requires moderator tier. Returns `queue.listPending()` as JSON.

#### admin.decide
`POST /api/moderate/decide` — body `{ id, status }`, requires moderator tier. Calls `queue.decide(id, status, user.handle ?? user.id)`, records an audit entry (`submission.<status>`), and returns the decision, or `404` if nothing pending matched.

#### admin.users
`GET /api/moderate/users?q=&roles=` — requires admin tier. With `q`, delegates to `cfg.users.search(q, 25)`; otherwise to `cfg.users.listByRoles(roles, 100)`, defaulting to every non-lowest role in the hierarchy.

#### admin.promote
`POST /api/moderate/promote` — body `{ userId, role }`, requires admin tier. Validates `role` against `validateRoles`, no-ops with `changed: false` if the user is already at that role, otherwise calls `cfg.users.setRole` and records a `user.role_changed` audit entry with `meta: { from, to }`.

#### onRequestGet / onRequestPost

These two names are **not exports of `@basenative/admin`.** They appear only in the usage example in `handlers.js`'s module docstring, showing the conventional way to wire the bag returned by `defineAdminHandlers()` into a Cloudflare Pages Functions route file:

```js
const admin = defineAdminHandlers({ /* ... */ });
export const onRequestGet = admin.listPending;
export const onRequestPost = admin.decide;
```

You write these bindings yourself, in your own route file, choosing whichever of the handlers above (`listPending`, `decide`, `users`, `promote`) belongs on each HTTP method for that route.

## Components (./components)

Server-rendered (or hydratable) HTML-string building blocks. Compatible with `@basenative/components` — theming flows through CSS custom properties on the wrapping element (`--bn-admin-bg`, `--bn-admin-fg`, `--bn-admin-muted`, `--bn-admin-accent`, `--bn-admin-ok`, `--bn-admin-bad`, `--bn-admin-danger`). No framework lock-in, no JSX, no hydration assumptions — output is plain HTML strings with `data-bn`/`data-action` attributes for you to wire up on the client.

### renderAdminQueueList({ items, approveLabel = 'APPROVE', rejectLabel = 'REJECT', emptyLabel = 'queue empty.', actionHandler = 'bn-admin-decide' } = {})

Render the moderation queue as a `role="list"` of `role="listitem"`s, each with labelled approve/reject buttons carrying `data-action`, `data-decision`, and `data-id` attributes for delegated event handling.

**Parameters:**
- `items` — array of `{ id, category, phrase, submittedBy, created_at? }`; returns `''` if not an array
- `approveLabel` / `rejectLabel` — button text
- `emptyLabel` — message shown (in a `role="status"` div) when `items` is empty
- `actionHandler` — value written to each button's `data-action` attribute

**Returns:** HTML string.

---

### renderAdminUserList({ users, results = null, query = '', currentHandle = '', roles = ['user', 'moderator', 'admin'], labels = {}, actionHandler = 'bn-admin-set-role', searchHandler = 'bn-admin-search' } = {})

Render the admin user-management list: a labelled `type="search"` input plus one section per user, each with a role badge and per-row buttons to set every other role (the lowest-tier button is flagged as a `bn-admin-btn--danger` "REMOVE" action). If `currentHandle` matches a row and that row's demote button is rendered, the button carries a `data-confirm` warning about self-demotion.

**Parameters:**
- `users` — array of `{ id, handle, role }` shown under the "current" section
- `results` — optional array of `{ id, handle, role }` search results shown above it; `null` hides the section entirely
- `query` — current value of the search input
- `currentHandle` — handle of the viewer, used to mark "(you)" and gate the self-demote confirmation
- `roles` — role list used to generate per-row action buttons; default `['user', 'moderator', 'admin']`
- `labels` — overrides for `{ search, currentSection, resultsSection, none }` copy
- `actionHandler` — `data-action` value for role-change buttons
- `searchHandler` — `data-action` value for the search input

**Returns:** HTML string.

## Integration

- `@basenative/auth` is an optional peer dependency (`peerDependenciesMeta.optional`). None of the modules above import it directly — every module is written storage/auth-agnostic, accepting resolvers you supply (`getCurrentUser`, `setRole`, `identifier`, etc.). In practice you'd implement `getCurrentUser` using `@basenative/auth`'s session helpers and `roleSeed`'s `setRole` using its user store, but that wiring lives in your app, not in this package.
- Apply `./migrations/0001` (or `AUDIT_MIGRATION` for just the audit table) before using `defineQueue` or `auditAction` against a fresh database.

## License

Apache-2.0
