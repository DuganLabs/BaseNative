// Built with BaseNative — basenative.dev
/**
 * Role primitives — generic, hierarchical, and zero-dependency.
 *
 * These mirror the t4bs convention (`user` < `moderator` < `admin`) but the
 * hierarchy is fully configurable. A higher-tier role implicitly has every
 * permission of the tiers below it.
 *
 * For permission-style RBAC (verbs like `posts.write`), reach for
 * `@basenative/auth/rbac` instead — this module is purpose-built for the
 * common moderation case where a small ordered ladder of roles is enough.
 *
 * @module
 */

/**
 * @typedef {object} RoleChecker
 * @property {string[]} hierarchy Roles ordered from least → most privileged.
 * @property {(user: any) => string} getRole Read role from a user-shaped object.
 * @property {(user: any, role: string) => boolean} hasRole Does user satisfy `role` (or higher)?
 * @property {(user: any) => boolean} isAdmin Convenience for the top tier.
 * @property {(user: any) => boolean} isModerator Convenience for tier ≥ "moderator" if present.
 * @property {(role: string) => (user: any) => boolean} requireRole Build a guard predicate.
 * @property {(role: string) => number} rank 0-based rank of `role`; -1 if unknown.
 */

/**
 * Build a role checker from a hierarchy.
 *
 * @param {{ hierarchy?: string[], adminRole?: string, moderatorRole?: string, defaultRole?: string }} [opts]
 * @returns {RoleChecker}
 *
 * @example
 *   const roles = defineRoles({ hierarchy: ['user', 'moderator', 'admin'] });
 *   roles.hasRole(user, 'moderator'); // true if admin OR moderator
 */
export function defineRoles(opts = {}) {
  const hierarchy = opts.hierarchy ?? ['user', 'moderator', 'admin'];
  if (!Array.isArray(hierarchy) || hierarchy.length === 0) {
    throw new TypeError('defineRoles: hierarchy must be a non-empty array');
  }
  const defaultRole = opts.defaultRole ?? hierarchy[0];
  const adminRole = opts.adminRole ?? hierarchy[hierarchy.length - 1];
  const moderatorRole = opts.moderatorRole ?? (hierarchy.includes('moderator') ? 'moderator' : null);

  const ranks = new Map(hierarchy.map((r, i) => [r, i]));
  const rank = (r) => (ranks.has(r) ? /** @type {number} */ (ranks.get(r)) : -1);

  const getRole = (user) => user?.role || defaultRole;
  const hasRole = (user, role) => rank(getRole(user)) >= rank(role);

  return {
    hierarchy: [...hierarchy],
    getRole,
    hasRole,
    rank,
    isAdmin: (user) => getRole(user) === adminRole,
    isModerator: (user) => (moderatorRole ? hasRole(user, moderatorRole) : false),
    requireRole: (role) => (user) => hasRole(user, role),
  };
}

/**
 * Pure helper — check role against any hierarchy without instantiating.
 *
 * @param {any} user
 * @param {string} role
 * @param {string[]} [hierarchy]
 */
export function hasRole(user, role, hierarchy = ['user', 'moderator', 'admin']) {
  const checker = defineRoles({ hierarchy });
  return checker.hasRole(user, role);
}

/**
 * Build a guard that throws (or returns a 403-shaped object) when the
 * supplied user does not satisfy the required role.
 *
 * Designed to plug into the t4bs/CF-Pages convention: handlers return
 * `{ user }` on success or `{ error: Response }` on failure.
 *
 * @param {string} role
 * @param {{ hierarchy?: string[], onDenied?: (role: string) => any }} [opts]
 */
export function requireRole(role, opts = {}) {
  const checker = defineRoles({ hierarchy: opts.hierarchy });
  const onDenied = opts.onDenied ?? ((r) =>
    new Response(JSON.stringify({ error: `${r}-only` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  return (user) => {
    if (!checker.hasRole(user, role)) return { error: onDenied(role) };
    return { user };
  };
}

/**
 * Seed an elevated role for a user when a deployment-time allowlist matches.
 *
 * Mirrors `seedAdminRole` in t4bs: when a user's identifier (handle/email)
 * appears in `seedMap`, their role is promoted on first sight. The actual DB
 * write is delegated to `setRole` so this stays storage-agnostic.
 *
 * @param {object} args
 * @param {Record<string,string>|string} [args.env] Deployment env. Either
 *   pass the bag directly and we'll read `args.envKey`, or hand us the raw
 *   comma-separated allowlist string.
 * @param {string} [args.envKey] e.g. "ADMIN_HANDLES" — the env var to consult.
 * @param {any} args.user The just-loaded user record.
 * @param {Record<string,string>} [args.seedMap] Optional explicit map of
 *   identifier → role. Wins over env.
 * @param {(user: any) => string} [args.identifier] Defaults to `u => u.handle`.
 * @param {string} [args.targetRole='admin'] Role to seed when matched.
 * @param {(userId: string, role: string, by: string) => Promise<void>} args.setRole
 *   DB writer, e.g. `d1Users(env.DB).setRole`.
 * @returns {Promise<any>} The user (possibly with updated role).
 */
export async function roleSeed({
  env,
  envKey = 'ADMIN_HANDLES',
  user,
  seedMap,
  identifier = (u) => u?.handle,
  targetRole = 'admin',
  setRole,
}) {
  if (!user) return user;
  if (user.role === targetRole) return user;
  if (typeof setRole !== 'function') return user;

  const ident = String(identifier(user) || '').toLowerCase();
  if (!ident) return user;

  let allowed = false;
  if (seedMap && Object.prototype.hasOwnProperty.call(seedMap, ident)) {
    allowed = seedMap[ident] === targetRole;
  } else if (env) {
    const raw = typeof env === 'string' ? env : (env[envKey] || '');
    const list = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    allowed = list.includes(ident);
  }

  if (!allowed) return user;
  await setRole(user.id, targetRole, `seed:${envKey}`);
  return { ...user, role: targetRole };
}
