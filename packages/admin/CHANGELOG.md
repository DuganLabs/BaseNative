# Changelog — @basenative/admin

## 0.1.0 — initial release

- `defineRoles` + `hasRole` + `requireRole` + `roleSeed` — hierarchical role primitives
- `defineQueue` — generic submission queue (submit / list / decide / promote-on-approve)
- `auditAction` + `withAudit` — append-only audit log with safe failure mode
- `defineAdminHandlers` — drop-in CF Worker / Pages Function handlers
- `renderAdminQueueList`, `renderAdminUserList` — server-rendered UI
- Migration `0001_audit_and_roles.sql`
