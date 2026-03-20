/**
 * Middleware that resolves tenant and attaches to ctx.state.tenant.
 *
 * @param {Function} resolver - A tenant resolver function (ctx) => string | null
 * @param {object} [options]
 * @param {string} [options.stateKey] - Key to store tenant under in ctx.state (default: "tenant")
 * @param {Function} [options.onNotFound] - Called when tenant cannot be resolved; receives (ctx)
 */
export function tenantMiddleware(resolver, options = {}) {
  const { stateKey = 'tenant', onNotFound } = options;

  return async function tenantMw(ctx, next) {
    const tenant = resolver(ctx);
    ctx.state[stateKey] = tenant;

    if (tenant == null && onNotFound) {
      onNotFound(ctx);
    }

    await next();
  };
}

/**
 * Middleware that rejects requests that have no tenant resolved.
 *
 * @param {object} [options]
 * @param {string} [options.stateKey] - Key to check in ctx.state (default: "tenant")
 * @param {number} [options.status] - HTTP status code for rejection (default: 400)
 * @param {string} [options.message] - Error message (default: "Tenant is required")
 */
export function requireTenant(options = {}) {
  const { stateKey = 'tenant', status = 400, message = 'Tenant is required' } = options;

  return async function requireTenantMw(ctx, next) {
    if (ctx.state[stateKey] == null) {
      ctx.response.status = status;
      ctx.response.body = { error: message };
      return;
    }

    await next();
  };
}

/**
 * Wraps a database adapter to automatically scope queries with tenant_id.
 *
 * @param {object} adapter - A database adapter with query/insert/update/delete methods
 * @param {object} [options]
 * @param {string} [options.column] - The tenant column name (default: "tenant_id")
 * @param {string} [options.stateKey] - Key to read tenant from ctx.state (default: "tenant")
 */
export function tenantScope(adapter, options = {}) {
  const { column = 'tenant_id', stateKey = 'tenant' } = options;

  return {
    query(ctx, table, filters = {}) {
      const tenant = ctx.state[stateKey];
      const scopedFilters = { ...filters, [column]: tenant };
      return adapter.query(table, scopedFilters);
    },

    insert(ctx, table, data) {
      const tenant = ctx.state[stateKey];
      const scopedData = { ...data, [column]: tenant };
      return adapter.insert(table, scopedData);
    },

    update(ctx, table, filters, data) {
      const tenant = ctx.state[stateKey];
      const scopedFilters = { ...filters, [column]: tenant };
      return adapter.update(table, scopedFilters, data);
    },

    delete(ctx, table, filters = {}) {
      const tenant = ctx.state[stateKey];
      const scopedFilters = { ...filters, [column]: tenant };
      return adapter.delete(table, scopedFilters);
    },
  };
}
