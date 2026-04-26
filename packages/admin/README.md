# @basenative/admin

A pluggable admin & moderation surface for BaseNative apps. Brings together
the four pieces that every "users-can-submit-stuff, mods-can-approve-it"
app rebuilds from scratch:

1. **Roles** — hierarchical (`user < moderator < admin`) with seedable
   admin promotion from a deployment-time allowlist.
2. **Queues** — submission table → approved target table, with per-row
   decide audit columns populated automatically.
3. **Audit log** — every protected action records who did what, when, and
   to which target — without ever crashing the request when the audit
   write fails.
4. **UI** — server-rendered building blocks (`<AdminQueueList>`,
   `<AdminUserList>`) that compose with `@basenative/components` and theme
   via CSS custom properties.

Worker-runtime first; works fine on Node where storage adapters allow.

## Install

```sh
pnpm add @basenative/admin
# Optional — gets you sessions/cookies for `getCurrentUser`
pnpm add @basenative/auth
```

## Roles

```js
import { defineRoles, requireRole, roleSeed } from '@basenative/admin/roles';

const roles = defineRoles({ hierarchy: ['user', 'moderator', 'admin'] });

roles.isAdmin(user);        // top tier?
roles.isModerator(user);    // ≥ moderator (admin counts)
roles.hasRole(user, 'moderator');

// Inside a handler:
const guard = requireRole('moderator');
const { user, error } = guard(currentUser);
if (error) return error;
```

### Seeding admins from env

Promote handles listed in `ADMIN_HANDLES` (comma-separated) on first sight:

```js
user = await roleSeed({
  env, envKey: 'ADMIN_HANDLES',
  user,
  setRole: (id, role, by) => d1Users(env.DB).setRole(id, role, by),
});
```

## Submission queue

```js
import { defineQueue } from '@basenative/admin/queue';

const queue = defineQueue({
  db: env.DB,
  tables: { submissions: 'submissions', target: 'phrases', columns: ['category', 'phrase'] },
});

await queue.submit({ category: 'Foods', phrase: 'apple pie', submittedBy: 'alice' });
const pending = await queue.listPending();
await queue.decide(pending[0].id, 'approved', 'mod1');
```

On approval the row is copied into the target table with `created_at` /
`created_by` populated from the moderator's decision. Override `onApprove`
if you need bespoke promotion logic.

## Drop-in handlers

```js
import { defineAdminHandlers } from '@basenative/admin/handlers';
import { currentUser } from '@basenative/auth';

const admin = defineAdminHandlers({
  queue,
  users: d1Users(env.DB),
  getCurrentUser: currentUser,
});

// functions/api/moderate/pending.js
export const onRequestGet = admin.listPending;

// functions/api/moderate/decide.js
export const onRequestPost = admin.decide;

// functions/api/moderate/users.js
export const onRequestGet = admin.users;

// functions/api/moderate/promote.js
export const onRequestPost = admin.promote;
```

## Audit log

```js
import { auditAction } from '@basenative/admin/audit';

await auditAction(env, {
  user,
  action: 'submission.approved',
  target: { type: 'submission', id: 42 },
  meta: { reason: 'duplicate' },
});
```

Audit failures are caught and logged — they never bubble up to the user.

## UI components

```js
import { renderAdminQueueList, renderAdminUserList } from '@basenative/admin/components';

const html = renderAdminQueueList({ items: pending });
const usersHtml = renderAdminUserList({
  users: elevated,
  results,
  query: q,
  currentHandle: me.handle,
});
```

Themable via CSS variables — `--bn-admin-bg`, `--bn-admin-fg`,
`--bn-admin-accent`, `--bn-admin-ok`, `--bn-admin-bad`,
`--bn-admin-danger`.

Action delegation: each button carries `data-action="bn-admin-decide"` (or
`bn-admin-set-role`) plus `data-id` / `data-decision` / `data-role`. Wire
a single document-level click handler that dispatches to your API.

## Migration

Apply `migrations/0001_audit_and_roles.sql` (also exported as
`AUDIT_MIGRATION`).

## Adopting incrementally

You can pull in the bits in any order:

1. Start with `roles` — the cheapest surface area; just wraps role checks.
2. Add `audit` next to start recording protected actions you already have.
3. Replace your queue endpoints with `handlers` once the data shape lines up.
4. Swap your queue UI for `components` last.

## License

Apache-2.0.
