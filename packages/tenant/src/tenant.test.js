import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSubdomainResolver,
  createPathResolver,
  createHeaderResolver,
  createCompositeResolver,
} from './resolver.js';
import {
  tenantMiddleware,
  requireTenant,
  tenantScope,
} from './middleware.js';

function createCtx(overrides = {}) {
  return {
    request: {
      method: 'GET',
      url: '/test',
      path: '/test',
      headers: {},
      cookies: {},
      query: {},
      ...overrides.request,
    },
    response: {
      status: undefined,
      headers: {},
      body: undefined,
      ...overrides.response,
    },
    state: { ...overrides.state },
  };
}

// --- Resolver tests ---

describe('createSubdomainResolver', () => {
  it('extracts tenant from subdomain with baseDomain', () => {
    const resolve = createSubdomainResolver({ baseDomain: 'example.com' });
    const ctx = createCtx({ request: { headers: { host: 'acme.example.com' } } });
    assert.equal(resolve(ctx), 'acme');
  });

  it('returns null when host matches base domain exactly', () => {
    const resolve = createSubdomainResolver({ baseDomain: 'example.com' });
    const ctx = createCtx({ request: { headers: { host: 'example.com' } } });
    assert.equal(resolve(ctx), null);
  });

  it('excludes www by default', () => {
    const resolve = createSubdomainResolver({ baseDomain: 'example.com' });
    const ctx = createCtx({ request: { headers: { host: 'www.example.com' } } });
    assert.equal(resolve(ctx), null);
  });

  it('auto-detects subdomain without baseDomain', () => {
    const resolve = createSubdomainResolver();
    const ctx = createCtx({ request: { headers: { host: 'tenant1.app.example.com' } } });
    assert.equal(resolve(ctx), 'tenant1');
  });

  it('returns null for bare domain without baseDomain', () => {
    const resolve = createSubdomainResolver();
    const ctx = createCtx({ request: { headers: { host: 'example.com' } } });
    assert.equal(resolve(ctx), null);
  });
});

describe('createPathResolver', () => {
  it('extracts tenant from path prefix', () => {
    const resolve = createPathResolver();
    const ctx = createCtx({ request: { path: '/t/acme/users' } });
    assert.equal(resolve(ctx), 'acme');
  });

  it('returns null for non-matching path', () => {
    const resolve = createPathResolver();
    const ctx = createCtx({ request: { path: '/api/users' } });
    assert.equal(resolve(ctx), null);
  });

  it('supports custom prefix', () => {
    const resolve = createPathResolver({ prefix: '/tenants' });
    const ctx = createCtx({ request: { path: '/tenants/corp/dashboard' } });
    assert.equal(resolve(ctx), 'corp');
  });
});

describe('createHeaderResolver', () => {
  it('resolves tenant from default header', () => {
    const resolve = createHeaderResolver();
    const ctx = createCtx({ request: { headers: { 'x-tenant-id': 'acme' } } });
    assert.equal(resolve(ctx), 'acme');
  });

  it('supports custom header name', () => {
    const resolve = createHeaderResolver({ header: 'x-org' });
    const ctx = createCtx({ request: { headers: { 'x-org': 'corp' } } });
    assert.equal(resolve(ctx), 'corp');
  });

  it('returns null when header is missing', () => {
    const resolve = createHeaderResolver();
    const ctx = createCtx({ request: { headers: {} } });
    assert.equal(resolve(ctx), null);
  });
});

describe('createCompositeResolver', () => {
  it('returns first non-null result', () => {
    const resolve = createCompositeResolver([
      () => null,
      () => 'from-second',
      () => 'from-third',
    ]);
    const ctx = createCtx();
    assert.equal(resolve(ctx), 'from-second');
  });

  it('returns null when all resolvers return null', () => {
    const resolve = createCompositeResolver([() => null, () => null]);
    const ctx = createCtx();
    assert.equal(resolve(ctx), null);
  });

  it('throws when given no resolvers', () => {
    assert.throws(() => createCompositeResolver([]), /at least one resolver/);
  });
});

// --- Middleware tests ---

describe('tenantMiddleware', () => {
  it('sets ctx.state.tenant from resolver', async () => {
    const mw = tenantMiddleware(() => 'acme');
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.state.tenant, 'acme');
  });

  it('calls onNotFound when tenant is null', async () => {
    let called = false;
    const mw = tenantMiddleware(() => null, { onNotFound: () => { called = true; } });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.state.tenant, null);
    assert.ok(called);
  });

  it('supports custom stateKey', async () => {
    const mw = tenantMiddleware(() => 'org1', { stateKey: 'org' });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.state.org, 'org1');
  });
});

describe('requireTenant', () => {
  it('calls next when tenant exists', async () => {
    const mw = requireTenant();
    const ctx = createCtx({ state: { tenant: 'acme' } });
    let called = false;
    await mw(ctx, async () => { called = true; });
    assert.ok(called);
  });

  it('rejects with 400 when tenant is missing', async () => {
    const mw = requireTenant();
    const ctx = createCtx();
    let called = false;
    await mw(ctx, async () => { called = true; });
    assert.equal(called, false);
    assert.equal(ctx.response.status, 400);
    assert.deepEqual(ctx.response.body, { error: 'Tenant is required' });
  });

  it('supports custom status and message', async () => {
    const mw = requireTenant({ status: 403, message: 'Forbidden' });
    const ctx = createCtx();
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 403);
    assert.deepEqual(ctx.response.body, { error: 'Forbidden' });
  });
});

describe('tenantScope', () => {
  it('scopes query with tenant_id', () => {
    const calls = [];
    const adapter = { query: (table, filters) => { calls.push({ table, filters }); } };
    const scoped = tenantScope(adapter);
    const ctx = createCtx({ state: { tenant: 'acme' } });
    scoped.query(ctx, 'users', { active: true });
    assert.deepEqual(calls[0], { table: 'users', filters: { active: true, tenant_id: 'acme' } });
  });

  it('scopes insert with tenant_id', () => {
    const calls = [];
    const adapter = { insert: (table, data) => { calls.push({ table, data }); } };
    const scoped = tenantScope(adapter);
    const ctx = createCtx({ state: { tenant: 'acme' } });
    scoped.insert(ctx, 'users', { name: 'alice' });
    assert.deepEqual(calls[0], { table: 'users', data: { name: 'alice', tenant_id: 'acme' } });
  });

  it('scopes update with tenant_id', () => {
    const calls = [];
    const adapter = { update: (table, filters, data) => { calls.push({ table, filters, data }); } };
    const scoped = tenantScope(adapter);
    const ctx = createCtx({ state: { tenant: 'acme' } });
    scoped.update(ctx, 'users', { id: 1 }, { name: 'bob' });
    assert.deepEqual(calls[0], { table: 'users', filters: { id: 1, tenant_id: 'acme' }, data: { name: 'bob' } });
  });

  it('scopes delete with tenant_id', () => {
    const calls = [];
    const adapter = { delete: (table, filters) => { calls.push({ table, filters }); } };
    const scoped = tenantScope(adapter);
    const ctx = createCtx({ state: { tenant: 'acme' } });
    scoped.delete(ctx, 'users', { id: 1 });
    assert.deepEqual(calls[0], { table: 'users', filters: { id: 1, tenant_id: 'acme' } });
  });

  it('supports custom column and stateKey', () => {
    const calls = [];
    const adapter = { query: (table, filters) => { calls.push({ table, filters }); } };
    const scoped = tenantScope(adapter, { column: 'org_id', stateKey: 'org' });
    const ctx = createCtx({ state: { org: 'corp' } });
    scoped.query(ctx, 'items', {});
    assert.deepEqual(calls[0], { table: 'items', filters: { org_id: 'corp' } });
  });
});
