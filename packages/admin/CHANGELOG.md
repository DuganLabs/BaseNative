# Changelog — @basenative/admin

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: pluggable admin & moderation surface — hierarchical role primitives, generic submission queue, append-only audit log middleware, drop-in CF Worker / Pages handlers, server-rendered queue/user list components, and a D1 migration.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/auth@0.3.0

## 0.1.0 — initial release

- `defineRoles` + `hasRole` + `requireRole` + `roleSeed` — hierarchical role primitives
- `defineQueue` — generic submission queue (submit / list / decide / promote-on-approve)
- `auditAction` + `withAudit` — append-only audit log with safe failure mode
- `defineAdminHandlers` — drop-in CF Worker / Pages Function handlers
- `renderAdminQueueList`, `renderAdminUserList` — server-rendered UI
- Migration `0001_audit_and_roles.sql`
