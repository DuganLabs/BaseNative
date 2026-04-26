// Built with BaseNative — basenative.dev
/**
 * @basenative/admin — moderation & admin surface.
 *
 * Subpath exports keep the bundle tree-shakeable. Most apps will pull in
 * just one or two of these — `./roles` for permission checks, `./queue` for
 * the submission flow, `./components` for the UI.
 *
 * @module
 */

export { defineRoles, hasRole, requireRole, roleSeed } from './roles.js';
export { defineQueue } from './queue.js';
export { auditAction, AUDIT_MIGRATION } from './audit.js';
export { defineAdminHandlers } from './handlers.js';
export { renderAdminQueueList, renderAdminUserList } from './components.js';
