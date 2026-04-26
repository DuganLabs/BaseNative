// Built with BaseNative — basenative.dev
/**
 * Drop-in CF Worker / Pages Function handlers for the admin & moderation
 * surface. Returns a bag of handlers you can spread into a route file:
 *
 *   const admin = defineAdminHandlers({ ... });
 *   export const onRequestGet  = admin.listPending;
 *   export const onRequestPost = admin.decide;
 *
 * The handlers are generic over: a role checker (`@basenative/admin/roles`),
 * a queue store (`@basenative/admin/queue`), a "current user" resolver
 * (`@basenative/auth` or your equivalent), and a users-table port for the
 * promote/search endpoints.
 *
 * @module
 */

import { auditAction } from './audit.js';
import { defineRoles } from './roles.js';

/**
 * @typedef {object} UsersPort
 * @property {(id: string) => Promise<any|null>} getById
 * @property {(id: string, role: string, by: string) => Promise<any>} setRole
 * @property {(q: string, limit?: number) => Promise<any[]>} search
 * @property {(roles: string[], limit?: number) => Promise<any[]>} listByRoles
 */

/**
 * @param {{
 *   queue: ReturnType<typeof import('./queue.js').defineQueue>,
 *   users: UsersPort,
 *   roles?: ReturnType<typeof defineRoles>,
 *   getCurrentUser: (request: Request, env: any) => Promise<any|null>,
 *   validateRoles?: string[],
 * }} cfg
 */
export function defineAdminHandlers(cfg) {
  if (!cfg?.queue) throw new TypeError('defineAdminHandlers: queue required');
  if (!cfg?.getCurrentUser) throw new TypeError('defineAdminHandlers: getCurrentUser required');

  const roles = cfg.roles ?? defineRoles();
  const validateRoles = cfg.validateRoles ?? roles.hierarchy;

  const ok = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  const fail = (message, status = 400) => ok({ error: message }, status);

  const requireMod = async (request, env) => {
    const user = await cfg.getCurrentUser(request, env);
    if (!user) return { error: fail('auth-required', 401) };
    if (!roles.isModerator(user)) return { error: fail('moderator-only', 403) };
    return { user };
  };
  const requireAdminTier = async (request, env) => {
    const user = await cfg.getCurrentUser(request, env);
    if (!user) return { error: fail('auth-required', 401) };
    if (!roles.isAdmin(user)) return { error: fail('admin-only', 403) };
    return { user };
  };

  return {
    /** GET /api/moderate/pending */
    listPending: async ({ request, env }) => {
      const auth = await requireMod(request, env);
      if (auth.error) return auth.error;
      return ok(await cfg.queue.listPending());
    },

    /** POST /api/moderate/decide  body: { id, status } */
    decide: async ({ request, env }) => {
      const auth = await requireMod(request, env);
      if (auth.error) return auth.error;
      const body = await readJson(request);
      if (!['approved', 'rejected'].includes(body.status)) return fail('bad-status', 400);
      if (body.id == null) return fail('bad-id', 400);
      const r = await cfg.queue.decide(body.id, body.status, auth.user.handle ?? auth.user.id);
      if (!r) return fail('not-found', 404);
      await auditAction(env, {
        user: auth.user,
        action: `submission.${body.status}`,
        target: { type: 'submission', id: body.id },
      });
      return ok(r);
    },

    /** GET /api/moderate/users?q=&roles= */
    users: async ({ request, env }) => {
      const auth = await requireAdminTier(request, env);
      if (auth.error) return auth.error;
      if (!cfg.users) return fail('users-port-missing', 501);
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') || '').trim();
      const rolesParam = (url.searchParams.get('roles') || '').trim();
      if (q) return ok(await cfg.users.search(q, 25));
      const requested = rolesParam ? rolesParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
      const list = requested ?? roles.hierarchy.filter((r) => r !== roles.hierarchy[0]);
      return ok(await cfg.users.listByRoles(list, 100));
    },

    /** POST /api/moderate/promote  body: { userId, role } */
    promote: async ({ request, env }) => {
      const auth = await requireAdminTier(request, env);
      if (auth.error) return auth.error;
      if (!cfg.users) return fail('users-port-missing', 501);
      const body = await readJson(request);
      const { userId, role } = body || {};
      if (!userId || typeof userId !== 'string') return fail('bad-userId', 400);
      if (!validateRoles.includes(role)) return fail('bad-role', 400);
      const target = await cfg.users.getById(userId);
      if (!target) return fail('not-found', 404);
      if (target.role === role) return ok({ ok: true, user: target, changed: false });
      await cfg.users.setRole(userId, role, auth.user.handle ?? auth.user.id);
      const updated = await cfg.users.getById(userId);
      await auditAction(env, {
        user: auth.user,
        action: 'user.role_changed',
        target: { type: 'user', id: userId },
        meta: { from: target.role, to: role },
      });
      return ok({ ok: true, user: updated, changed: true });
    },
  };
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}
