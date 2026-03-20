/**
 * Role-Based Access Control (RBAC) engine.
 */

/**
 * Define roles and their permissions.
 *
 * @param {object} definition - Role definitions
 * @returns {object} RBAC engine
 *
 * @example
 * const rbac = defineRoles({
 *   admin: { permissions: ['*'] },
 *   editor: { permissions: ['read', 'write'], inherits: ['viewer'] },
 *   viewer: { permissions: ['read'] },
 * });
 */
export function defineRoles(definition) {
  const roles = new Map();

  for (const [name, config] of Object.entries(definition)) {
    roles.set(name, {
      permissions: new Set(config.permissions ?? []),
      inherits: config.inherits ?? [],
    });
  }

  function getEffectivePermissions(roleName, visited = new Set()) {
    if (visited.has(roleName)) return new Set();
    visited.add(roleName);

    const role = roles.get(roleName);
    if (!role) return new Set();

    const perms = new Set(role.permissions);

    for (const parent of role.inherits) {
      for (const perm of getEffectivePermissions(parent, visited)) {
        perms.add(perm);
      }
    }

    return perms;
  }

  return {
    /**
     * Check if a role has a specific permission.
     */
    can(roleName, permission) {
      const perms = getEffectivePermissions(roleName);
      return perms.has('*') || perms.has(permission);
    },

    /**
     * Check if a role has ALL of the specified permissions.
     */
    canAll(roleName, permissions) {
      const perms = getEffectivePermissions(roleName);
      if (perms.has('*')) return true;
      return permissions.every(p => perms.has(p));
    },

    /**
     * Check if a role has ANY of the specified permissions.
     */
    canAny(roleName, permissions) {
      const perms = getEffectivePermissions(roleName);
      if (perms.has('*')) return true;
      return permissions.some(p => perms.has(p));
    },

    /**
     * Get all effective permissions for a role (including inherited).
     */
    getPermissions(roleName) {
      return [...getEffectivePermissions(roleName)];
    },

    /**
     * List all defined role names.
     */
    getRoles() {
      return [...roles.keys()];
    },

    /**
     * Check if a role name exists.
     */
    hasRole(roleName) {
      return roles.has(roleName);
    },
  };
}

/**
 * Create a route guard that checks permissions.
 *
 * @param {object} rbac - RBAC engine from defineRoles()
 * @param {object} options
 * @returns {Function} Middleware function
 */
export function createGuard(rbac, options = {}) {
  const {
    getRoleFromContext = (ctx) => ctx.state?.user?.role,
    onDenied = (ctx) => {
      ctx.response.status = 403;
      ctx.response.body = 'Forbidden';
    },
  } = options;

  return {
    /**
     * Require a specific permission.
     */
    require(permission) {
      return async (ctx, next) => {
        const role = getRoleFromContext(ctx);
        if (!role || !rbac.can(role, permission)) {
          onDenied(ctx);
          return;
        }
        await next();
      };
    },

    /**
     * Require any of the specified permissions.
     */
    requireAny(...permissions) {
      return async (ctx, next) => {
        const role = getRoleFromContext(ctx);
        if (!role || !rbac.canAny(role, permissions)) {
          onDenied(ctx);
          return;
        }
        await next();
      };
    },

    /**
     * Require a specific role.
     */
    requireRole(...roleNames) {
      return async (ctx, next) => {
        const role = getRoleFromContext(ctx);
        if (!role || !roleNames.includes(role)) {
          onDenied(ctx);
          return;
        }
        await next();
      };
    },
  };
}
