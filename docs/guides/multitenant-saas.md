# Building a Multi-tenant SaaS with BaseNative

This tutorial builds a multi-tenant project management app from scratch. By the
end you'll have a working SaaS where each organization gets its own isolated
workspace accessed via subdomain.

**What you'll build:**
- Subdomain-based tenant routing (`acme.app.com`, `beta.app.com`)
- Shared database with row-level tenant isolation
- Per-tenant RBAC (admin, member, viewer roles)
- Tenant-scoped SSR pages with live signal updates
- Tenant onboarding flow

**Packages used:** `@basenative/server`, `@basenative/runtime`,
`@basenative/router`, `@basenative/auth`, `@basenative/db`,
`@basenative/middleware`, `@basenative/tenant`, `@basenative/forms`

---

## 1. Project setup

```bash
npm create basenative@latest my-saas
cd my-saas
pnpm install
```

Create the directory structure:

```
my-saas/
├── server.js          # Entry point
├── src/
│   ├── middleware/
│   │   └── pipeline.js
│   ├── pages/
│   │   ├── dashboard.html
│   │   ├── projects.html
│   │   └── settings.html
│   ├── components/
│   │   └── project-card.html
│   └── db/
│       └── schema.sql
└── public/
    └── app.js         # Client runtime
```

---

## 2. Database schema

```sql
-- src/db/schema.sql

CREATE TABLE tenants (
  id VARCHAR(63) PRIMARY KEY,         -- slug: "acme", "beta-corp"
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',    -- free | pro | enterprise
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(63) NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- admin | member | viewer
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(63) NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Essential: index tenant_id on every tenant-scoped table
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
```

---

## 3. Database setup

```js
// src/db/client.js
import { createQueryBuilder } from '@basenative/db';
import { createSQLiteAdapter } from '@basenative/db/adapters/sqlite';

const adapter = createSQLiteAdapter({ filename: './data.db' });
export const db = createQueryBuilder(adapter);
```

Initialize the schema on startup:

```js
// src/db/init.js
import { readFileSync } from 'node:fs';
import { db } from './client.js';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export async function initDb() {
  for (const statement of schema.split(';').filter(s => s.trim())) {
    await db.execute(statement);
  }
}
```

---

## 4. Middleware pipeline

```js
// src/middleware/pipeline.js
import { createPipeline } from '@basenative/middleware';
import { cors } from '@basenative/middleware/cors';
import { rateLimit } from '@basenative/middleware/rate-limit';
import { sessionMiddleware } from '@basenative/auth';
import {
  createSubdomainResolver,
  tenantMiddleware,
  requireTenant,
  tenantScope,
} from '@basenative/tenant';
import { db } from '../db/client.js';

// Resolve tenant from subdomain: acme.myapp.com → "acme"
const tenantResolver = createSubdomainResolver({
  baseDomain: process.env.BASE_DOMAIN ?? 'localhost',
  exclude: ['www', 'api', 'admin'],
});

export function buildPipeline() {
  const pipeline = createPipeline();

  pipeline.use(cors({ origin: (origin) => origin.endsWith('.myapp.com') }));
  pipeline.use(rateLimit({ windowMs: 60_000, max: 200 }));

  // 1. Resolve tenant from subdomain
  pipeline.use(tenantMiddleware(tenantResolver));

  // 2. Load session (auth)
  pipeline.use(sessionMiddleware({ secret: process.env.SESSION_SECRET }));

  // 3. For authenticated routes, load tenant data
  pipeline.use(async (ctx, next) => {
    const tenantId = ctx.state.tenant;
    if (!tenantId) { await next(); return; }

    const tenant = await db.queryOne(
      'SELECT * FROM tenants WHERE id = ?', [tenantId]
    );

    if (!tenant) {
      ctx.response.status = 404;
      ctx.response.body = 'Tenant not found';
      return;
    }

    // Attach tenant-scoped db to context
    ctx.state.tenantDb = tenantScope(db, { column: 'tenant_id', tenantId });
    ctx.state.tenantData = tenant;
    await next();
  });

  return pipeline;
}
```

---

## 5. Auth routes

```js
// src/routes/auth.js
import { hashPassword, verifyPassword, createSession } from '@basenative/auth';
import { db } from '../db/client.js';

export async function handleLogin(ctx) {
  const { email, password } = await ctx.request.json();
  const tenantId = ctx.state.tenant;

  const user = await db.queryOne(
    'SELECT * FROM users WHERE tenant_id = ? AND email = ?',
    [tenantId, email]
  );

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Invalid credentials' };
    return;
  }

  await createSession(ctx, { userId: user.id, tenantId, role: user.role });
  ctx.response.body = { ok: true };
}

export async function handleRegister(ctx) {
  const { email, password, tenantName } = await ctx.request.json();

  // Create tenant slug from name
  const tenantId = tenantName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 63);

  // Check tenant doesn't already exist
  const existing = await db.queryOne(
    'SELECT id FROM tenants WHERE id = ?', [tenantId]
  );
  if (existing) {
    ctx.response.status = 409;
    ctx.response.body = { error: 'Organization name already taken' };
    return;
  }

  const passwordHash = await hashPassword(password);

  // Create tenant and admin user in a transaction
  await db.transaction(async (tx) => {
    await tx.execute(
      'INSERT INTO tenants (id, name) VALUES (?, ?)',
      [tenantId, tenantName]
    );
    await tx.execute(
      'INSERT INTO users (tenant_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [tenantId, email, passwordHash, 'admin']
    );
  });

  ctx.response.body = {
    ok: true,
    subdomain: tenantId,
    redirectTo: `https://${tenantId}.myapp.com/dashboard`,
  };
}
```

---

## 6. Dashboard page

The dashboard shows all projects for the current tenant. State is server-rendered
then hydrated for live updates.

```html
<!-- src/pages/dashboard.html -->
<main>
  <header>
    <h1>{{ tenantName }} Projects</h1>
    <span>{{ projectCount }} projects</span>
    <button @click="showCreateModal = true">New Project</button>
  </header>

  <section aria-label="Projects">
    @if projects.length === 0
      <p>No projects yet. Create your first project to get started.</p>
    @else
      <ul role="list">
        @for project in projects track project.id
          <li>
            <article>
              <h2>{{ project.name }}</h2>
              <p>{{ project.description }}</p>
              <footer>
                <span :class="'status-' + project.status">{{ project.status }}</span>
              </footer>
            </article>
          </li>
        @empty
          <li>No active projects</li>
        @endfor
      </ul>
    @endif
  </section>

  @if showCreateModal
    <dialog open aria-modal="true" aria-label="Create project">
      <form @submit.prevent="createProject(form)">
        <h2>New Project</h2>
        <label>
          Name
          <input type="text" :value="form.name" @input="form.name = $event.target.value" required>
        </label>
        <label>
          Description
          <textarea :value="form.description" @input="form.description = $event.target.value"></textarea>
        </label>
        <footer>
          <button type="button" @click="showCreateModal = false">Cancel</button>
          <button type="submit">Create Project</button>
        </footer>
      </form>
    </dialog>
  @endif
</main>
```

---

## 7. Dashboard server handler

```js
// src/routes/dashboard.js
import { render } from '@basenative/server';
import { readFileSync } from 'node:fs';

const template = readFileSync(
  new URL('../pages/dashboard.html', import.meta.url), 'utf8'
);

export async function handleDashboard(ctx) {
  if (!ctx.state.session?.userId) {
    ctx.response.redirect('/login');
    return;
  }

  const { tenantDb, tenantData } = ctx.state;

  // All queries automatically scoped to the tenant via tenantScope
  const projects = await tenantDb.query(ctx, 'projects', {
    status: 'active',
  });

  const html = render(template, {
    tenantName: tenantData.name,
    projectCount: projects.length,
    projects,
    showCreateModal: false,
    form: { name: '', description: '' },
  });

  ctx.response.headers.set('Content-Type', 'text/html');
  ctx.response.body = `<!doctype html><html><body>${html}</body></html>`;
}
```

---

## 8. Client-side hydration

```js
// public/app.js
import { hydrate, signal } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime/+esm';

// Hydrate the dashboard with live state
hydrate(document.body, {
  projects: signal(window.__INITIAL_DATA__.projects ?? []),
  showCreateModal: signal(false),
  form: signal({ name: '', description: '' }),

  async createProject(form) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const project = await res.json();
      this.projects.set(prev => [...prev, project]);
      this.showCreateModal.set(false);
      this.form.set({ name: '', description: '' });
    }
  },
});
```

Pass initial data from the server to avoid a hydration flash:

```js
// In your server handler, after rendering:
const initScript = `<script>window.__INITIAL_DATA__ = ${
  JSON.stringify({ projects })
}</script>`;
```

---

## 9. Project API (create/update/delete)

```js
// src/routes/projects.js
export async function handleCreateProject(ctx) {
  const { tenantDb } = ctx.state;
  const { name, description } = await ctx.request.json();

  if (!name?.trim()) {
    ctx.response.status = 400;
    ctx.response.body = { error: 'Project name is required' };
    return;
  }

  // tenantScope automatically injects tenant_id
  const project = await tenantDb.insert(ctx, 'projects', {
    name: name.trim(),
    description: description?.trim() ?? '',
    created_by: ctx.state.session.userId,
  });

  ctx.response.status = 201;
  ctx.response.body = project;
}

export async function handleDeleteProject(ctx) {
  const { id } = ctx.params;
  const { tenantDb, session } = ctx.state;

  // Tenant isolation: tenantScope ensures this only touches the current tenant's rows
  const deleted = await tenantDb.delete(ctx, 'projects', { id });

  if (!deleted) {
    ctx.response.status = 404;
    ctx.response.body = { error: 'Project not found' };
    return;
  }

  ctx.response.body = { ok: true };
}
```

---

## 10. Router wiring

```js
// server.js
import { createServer } from 'node:http';
import { resolveRoute } from '@basenative/router';
import { buildPipeline } from './src/middleware/pipeline.js';
import { handleLogin, handleRegister } from './src/routes/auth.js';
import { handleDashboard } from './src/routes/dashboard.js';
import {
  handleCreateProject,
  handleDeleteProject,
} from './src/routes/projects.js';
import { initDb } from './src/db/init.js';

const routes = [
  { method: 'GET',    path: '/',                handler: handleDashboard },
  { method: 'GET',    path: '/dashboard',        handler: handleDashboard },
  { method: 'POST',   path: '/api/auth/login',   handler: handleLogin },
  { method: 'POST',   path: '/api/auth/register',handler: handleRegister },
  { method: 'POST',   path: '/api/projects',     handler: handleCreateProject },
  { method: 'DELETE', path: '/api/projects/:id', handler: handleDeleteProject },
];

const pipeline = buildPipeline();

await initDb();

const server = createServer(async (req, res) => {
  const match = resolveRoute(routes, req.method, req.url);

  if (!match) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ctx = {
    request: { ...req, params: match.params },
    response: { status: 200, headers: new Headers(), body: null },
    state: {},
  };

  await pipeline.run(ctx, () => match.handler(ctx));

  res.writeHead(ctx.response.status, Object.fromEntries(ctx.response.headers));
  res.end(
    typeof ctx.response.body === 'string'
      ? ctx.response.body
      : JSON.stringify(ctx.response.body)
  );
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Visit http://acme.localhost:3000/dashboard to test multi-tenancy');
});
```

---

## 11. Tenant onboarding

The registration flow creates a new tenant and redirects to their subdomain:

```html
<!-- src/pages/register.html -->
<main>
  <h1>Start your free trial</h1>
  <form @submit.prevent="register(form)">
    <label>
      Organization name
      <input
        type="text"
        :value="form.tenantName"
        @input="form.tenantName = $event.target.value"
        placeholder="Acme Corp"
        required
      >
      <small>Your workspace URL: {{ slug }}.myapp.com</small>
    </label>
    <label>
      Work email
      <input
        type="email"
        :value="form.email"
        @input="form.email = $event.target.value"
        required
      >
    </label>
    <label>
      Password
      <input
        type="password"
        :value="form.password"
        @input="form.password = $event.target.value"
        minlength="8"
        required
      >
    </label>
    @if error
      <p role="alert">{{ error }}</p>
    @endif
    <button type="submit" :disabled="submitting">
      {{ submitting ? 'Creating workspace…' : 'Create workspace' }}
    </button>
  </form>
</main>
```

```js
// public/register.js
import { hydrate, signal, computed } from '/@basenative/runtime/+esm';

hydrate(document.body, {
  form: signal({ tenantName: '', email: '', password: '' }),
  error: signal(''),
  submitting: signal(false),

  slug: computed(() => {
    return (this.form.get().tenantName || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 63) || 'your-org';
  }),

  async register(form) {
    this.submitting.set(true);
    this.error.set('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        this.error.set(data.error ?? 'Registration failed');
        return;
      }

      // Redirect to their new subdomain
      window.location.href = data.redirectTo;
    } finally {
      this.submitting.set(false);
    }
  },
});
```

---

## 12. Per-tenant settings page

```html
<!-- src/pages/settings.html -->
<main>
  <h1>{{ tenantName }} Settings</h1>

  <section aria-labelledby="team-heading">
    <h2 id="team-heading">Team Members</h2>
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for user in users track user.id
          <tr>
            <td>{{ user.email }}</td>
            <td>
              @if currentUserRole === 'admin'
                <select :value="user.role" @change="updateRole(user.id, $event.target.value)">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              @else
                {{ user.role }}
              @endif
            </td>
            <td>
              @if currentUserRole === 'admin' && user.id !== currentUserId
                <button @click="removeUser(user.id)">Remove</button>
              @endif
            </td>
          </tr>
        @endfor
      </tbody>
    </table>

    @if currentUserRole === 'admin'
      <form @submit.prevent="inviteUser(inviteEmail)">
        <label>
          Invite by email
          <input
            type="email"
            :value="inviteEmail"
            @input="inviteEmail = $event.target.value"
            placeholder="colleague@example.com"
          >
        </label>
        <button type="submit">Send invite</button>
      </form>
    @endif
  </section>

  <section aria-labelledby="plan-heading">
    <h2 id="plan-heading">Plan: {{ plan }}</h2>
    @if plan === 'free'
      <p>Upgrade to Pro for unlimited projects and team members.</p>
      <button @click="upgradePlan()">Upgrade to Pro</button>
    @endif
  </section>
</main>
```

---

## 13. Security checklist

Before deploying a multi-tenant app, verify:

**Tenant isolation**
- [ ] Every database query goes through `tenantScope` or manually includes `tenant_id = ?`
- [ ] API routes validate that the requested resource belongs to `ctx.state.tenant`
- [ ] Sessions store `tenantId` and validate it on every request
- [ ] File uploads are stored under a tenant-namespaced path

**Authentication**
- [ ] Passwords are hashed with `hashPassword` (bcrypt/argon2 internally)
- [ ] Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] CSRF protection is enabled for state-changing requests

**Subdomain handling**
- [ ] Wildcard TLS certificate covers `*.myapp.com`
- [ ] Invalid tenant slugs return 404, not 500
- [ ] Reserved slugs (`www`, `api`, `admin`) are excluded from tenant resolution

**Rate limiting**
- [ ] Auth endpoints have stricter rate limits (10 req/min for login)
- [ ] Per-tenant rate limits prevent noisy tenants from affecting others

---

## 14. Local development with subdomains

For local development, use `/etc/hosts` or a DNS tool like `dnsmasq` to route
subdomains to localhost:

```bash
# /etc/hosts — add one line per test tenant
127.0.0.1  acme.localhost
127.0.0.1  beta.localhost
```

Then visit `http://acme.localhost:3000/dashboard`.

Alternatively, use path-based resolution during development:

```js
// In development, accept both path-prefix and subdomain resolution
import { createCompositeResolver, createSubdomainResolver, createPathResolver } from '@basenative/tenant';

const resolver = process.env.NODE_ENV === 'development'
  ? createCompositeResolver([
      createPathResolver({ prefix: '/t' }),
      createSubdomainResolver({ baseDomain: 'localhost' }),
    ])
  : createSubdomainResolver({ baseDomain: process.env.BASE_DOMAIN });
```

Access: `http://localhost:3000/t/acme/dashboard` — no DNS setup needed.

---

## Next steps

- **Real-time collaboration**: Add `@basenative/realtime` for live project updates
  across team members in the same tenant
- **Email notifications**: Use `@basenative/notify` to send invite emails via SMTP
- **Feature flags**: Gate beta features to specific tenants with `@basenative/flags`
- **Billing**: Integrate with Stripe webhooks to update the `tenants.plan` column
- **Audit logging**: Log all write operations with tenant context using `@basenative/logger`

See the [multi-tenancy architecture guide](./multi-tenancy.md) for deeper coverage
of isolation strategies, migrations, and scaling.
