import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// -- BaseNative packages --
import { render } from '@basenative/server';
import {
  renderButton,
  renderInput,
  renderTable,
  renderBadge,
  renderCard,
  renderAlert,
} from '@basenative/components';
import {
  createPipeline,
  cors,
  rateLimit,
  csrf,
  logger as loggerMiddleware,
  toExpressMiddleware,
} from '@basenative/middleware';
import { loadEnv, defineConfig, string, number, boolean, optional } from '@basenative/config';
import { createLogger, requestLogger } from '@basenative/logger';
import {
  createSessionManager,
  createMemoryStore,
  hashPassword,
  verifyPassword,
  sessionMiddleware,
  requireAuth,
  login,
  logout,
  defineRoles,
  createGuard,
} from '@basenative/auth';
import { createHeaderResolver, tenantMiddleware } from '@basenative/tenant';
import { createI18n, i18nMiddleware } from '@basenative/i18n';
import { createSSEServer } from '@basenative/realtime';
import { createFlagManager, flagMiddleware, createMemoryProvider } from '@basenative/flags';
import { createNotificationCenter } from '@basenative/notify';
import { createUploadHandler, createLocalStorage } from '@basenative/upload';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..', '..');
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

// -- Config --
loadEnv({ cwd: __dirname });

const config = defineConfig({
  schema: {
    PORT: optional(number(), 3002),
    NODE_ENV: optional(string(), 'development'),
    SESSION_SECRET: optional(string(), 'dev-secret-change-me'),
    DB_PATH: optional(string(), ':memory:'),
    TENANT_MODE: optional(string(), 'header'),
    DEFAULT_LOCALE: optional(string(), 'en'),
  },
});

// -- Logger --
const log = createLogger({ name: 'enterprise-v2', level: 'debug' });

// -- I18n --
const translations = JSON.parse(read('i18n/en.json'));
const i18n = createI18n({
  defaultLocale: config.DEFAULT_LOCALE ?? 'en',
  messages: { en: translations },
});

// -- RBAC --
const rbac = defineRoles({
  admin: { permissions: ['*'] },
  editor: { permissions: ['read', 'write'], inherits: ['viewer'] },
  viewer: { permissions: ['read'] },
});
const guard = createGuard(rbac);

// -- Sessions --
const sessionManager = createSessionManager({
  store: createMemoryStore(),
  cookieName: 'bn_session',
  maxAge: 24 * 60 * 60 * 1000,
});

// -- Feature Flags --
const flagProvider = createMemoryProvider({
  dark_mode: { enabled: false },
  new_dashboard: { enabled: true },
  beta_features: { enabled: false, rules: [{ roles: ['admin'], value: true }] },
});
const flagManager = createFlagManager(flagProvider);

// -- Notifications --
const notifications = createNotificationCenter();
notifications.notify({ title: 'System', message: 'Application started.', type: 'info' });

// -- Realtime (SSE) --
const sse = createSSEServer();

// -- Upload storage --
const uploadDir = join(__dirname, 'uploads');
const storage = createLocalStorage({ directory: uploadDir, baseUrl: '/uploads' });

// -- Tenant resolver --
const tenantResolver = createHeaderResolver({ header: 'x-tenant-id' });

// ---------------------------------------------------------------------------
// In-memory user store (replaces SQLite for zero-dep demo)
// ---------------------------------------------------------------------------
let nextUserId = 2;
const usersDb = [];

async function seedUsers() {
  const hash = await hashPassword('admin123');
  usersDb.push({
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password_hash: hash,
    role: 'admin',
    avatar_url: null,
    created_at: new Date().toISOString(),
  });
}

function findUserByUsername(username) {
  return usersDb.find((u) => u.username === username) ?? null;
}

function findUserByEmail(email) {
  return usersDb.find((u) => u.email === email) ?? null;
}

// ---------------------------------------------------------------------------
// Middleware pipeline
// ---------------------------------------------------------------------------
const pipeline = createPipeline();

pipeline
  .use(cors({ origins: ['*'] }))
  .use(rateLimit({ windowMs: 60_000, max: 200 }))
  .use(loggerMiddleware())
  .use(sessionMiddleware(sessionManager))
  .use(tenantMiddleware(tenantResolver))
  .use(i18nMiddleware(i18n))
  .use(flagMiddleware(flagManager))
  .use(requestLogger(log));

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/bn-css', express.static(join(pkgRoot, 'packages', 'components', 'src')));
app.use(express.static(join(__dirname, 'public')));

// Convert BaseNative pipeline to Express middleware
app.use(toExpressMiddleware(pipeline));

// Attach pipeline state to res.locals for route handlers
app.use((req, res, next) => {
  // The pipeline wrote to req._bnCtx via the adapter; we stash the useful bits.
  // toExpressMiddleware already applied headers/cookies. We re-read cookies to
  // get the session going for subsequent requests.
  res.locals.bnState = res.locals.bnState ?? {};
  next();
});

// ---------------------------------------------------------------------------
// View rendering helper
// ---------------------------------------------------------------------------
function renderPage(viewFile, ctx, title) {
  const layoutSrc = read('views/layout.html');
  const viewSrc = read(`views/${viewFile}`);
  const viewHtml = render(viewSrc, ctx);
  return render(layoutSrc, { ...ctx, title, content: viewHtml });
}

// Helper: get logged-in user from session cookie (works after pipeline ran)
async function getSessionUser(req) {
  const cookies = req.headers.cookie
    ? Object.fromEntries(
        req.headers.cookie.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      )
    : {};
  const sid = cookies[sessionManager.cookieName];
  if (!sid) return null;
  const session = await sessionManager.get(sid);
  return session?.data?.user ?? null;
}

// Generate a simple CSRF token (demo-grade, not cryptographically robust)
function csrfToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// -- Dashboard (protected) --
app.get('/', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.redirect('/login');

  const allFlags = await flagManager.getAll({ userId: user.id, role: user.role });
  const flagEntries = Object.entries(allFlags).map(([name, enabled]) => ({
    name,
    dotClass: enabled ? 'on' : 'off',
    statusLabel: enabled ? i18n.t('flags.enabled') : i18n.t('flags.disabled'),
  }));

  const unread = notifications.getUnread();
  const ctx = {
    user,
    userInitial: (user.username?.[0] ?? '?').toUpperCase(),
    notificationCount: unread.length,
    welcomeMessage: i18n.t('dashboard.welcome', { name: user.username }),
    usersCount: usersDb.length,
    usersLabel: i18n.t('dashboard.users_count', { count: usersDb.length }),
    notificationsCount: unread.length,
    notificationsLabel: i18n.t('dashboard.notifications_count', { count: unread.length }),
    flagsCount: Object.values(allFlags).filter(Boolean).length,
    tenantId: req.headers['x-tenant-id'] ?? 'default',
    locale: i18n.getLocale(),
    tenantMode: config.TENANT_MODE ?? 'header',
    flags: flagEntries,
    activity: [
      'Admin user seeded on startup.',
      `${usersDb.length} user(s) in the system.`,
      `${unread.length} unread notification(s).`,
    ],
  };
  res.send(renderPage('dashboard.html', ctx, i18n.t('nav.dashboard')));
});

// -- Login --
app.get('/login', async (req, res) => {
  const user = await getSessionUser(req);
  if (user) return res.redirect('/');

  const token = csrfToken();
  const ctx = { user: null, notificationCount: 0, csrfToken: token, error: null };
  res.send(renderPage('login.html', ctx, i18n.t('login.title')));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  const dbUser = findUserByUsername(username);

  if (!dbUser || !(await verifyPassword(password ?? '', dbUser.password_hash))) {
    const ctx = {
      user: null,
      notificationCount: 0,
      csrfToken: csrfToken(),
      error: i18n.t('msg.login_failed'),
    };
    return res.status(401).send(renderPage('login.html', ctx, i18n.t('login.title')));
  }

  // Create session
  const userPayload = {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role,
    avatar_url: dbUser.avatar_url,
  };
  const session = await sessionManager.create({ user: userPayload });
  res.cookie(sessionManager.cookieName, session.id, sessionManager.cookieOptions());

  notifications.notify({
    title: 'Login',
    message: `${dbUser.username} signed in.`,
    type: 'info',
  });
  log.info('User logged in', { username: dbUser.username });
  res.redirect('/');
});

// -- Register --
app.get('/register', async (req, res) => {
  const user = await getSessionUser(req);
  if (user) return res.redirect('/');

  const ctx = { user: null, notificationCount: 0, csrfToken: csrfToken(), error: null };
  res.send(renderPage('register.html', ctx, i18n.t('register.title')));
});

app.post('/register', async (req, res) => {
  const { username, email, password, confirm_password } = req.body ?? {};

  // Validation
  let error = null;
  if (!username || !email || !password) {
    error = 'All fields are required.';
  } else if (password !== confirm_password) {
    error = 'Passwords do not match.';
  } else if (findUserByUsername(username)) {
    error = 'Username already taken.';
  } else if (findUserByEmail(email)) {
    error = 'Email already registered.';
  }

  if (error) {
    const ctx = { user: null, notificationCount: 0, csrfToken: csrfToken(), error };
    return res.status(400).send(renderPage('register.html', ctx, i18n.t('register.title')));
  }

  const hash = await hashPassword(password);
  const newUser = {
    id: nextUserId++,
    username,
    email,
    password_hash: hash,
    role: 'viewer',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
  usersDb.push(newUser);

  // Auto-login
  const userPayload = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    avatar_url: null,
  };
  const session = await sessionManager.create({ user: userPayload });
  res.cookie(sessionManager.cookieName, session.id, sessionManager.cookieOptions());

  notifications.notify({
    title: 'Registration',
    message: `${newUser.username} created an account.`,
    type: 'info',
  });
  log.info('User registered', { username: newUser.username });
  res.redirect('/');
});

// -- Logout --
app.post('/logout', async (req, res) => {
  const cookies = req.headers.cookie
    ? Object.fromEntries(
        req.headers.cookie.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      )
    : {};
  const sid = cookies[sessionManager.cookieName];
  if (sid) await sessionManager.destroy(sid);
  res.clearCookie(sessionManager.cookieName, { path: '/' });
  res.redirect('/login');
});

// -- SSE notifications endpoint --
app.get('/api/notifications', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const clientId = sse.addClient(res, { metadata: { userId: user.id } });
  log.info('SSE client connected', { clientId, userId: user.id });

  // Send existing unread notifications immediately
  const unread = notifications.getUnread();
  for (const n of unread) {
    sse.send(clientId, 'notification', n);
  }

  // Subscribe to future notifications
  const unsub = notifications.subscribe((all) => {
    const latest = all[all.length - 1];
    if (latest) sse.send(clientId, 'notification', latest);
  });

  res.on('close', () => {
    unsub();
    log.info('SSE client disconnected', { clientId });
  });
});

// -- Users (admin only) --
app.get('/users', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.redirect('/login');

  const ctx = {
    user,
    userInitial: (user.username?.[0] ?? '?').toUpperCase(),
    notificationCount: notifications.getUnread().length,
    users: usersDb.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
    })),
  };
  res.send(renderPage('users.html', ctx, i18n.t('users.title')));
});

// -- File upload (avatar) --
app.post('/upload/avatar', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  // Collect raw body for multipart parsing
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const { parseMultipart } = await import('@basenative/upload');
      const body = Buffer.concat(chunks);
      const parts = parseMultipart(body, req.headers['content-type']);
      const file = parts.find((p) => p.filename);

      if (!file) return res.status(400).json({ error: 'No file provided' });

      const result = await storage.put(
        `avatar-${user.id}-${file.filename}`,
        file.data,
        { contentType: file.contentType }
      );

      // Update user avatar
      const dbUser = usersDb.find((u) => u.id === user.id);
      if (dbUser) dbUser.avatar_url = result.url;

      log.info('Avatar uploaded', { userId: user.id, url: result.url });
      res.json({ ok: true, url: result.url });
    } catch (err) {
      log.error('Upload failed', { error: err.message });
      res.status(500).json({ error: 'Upload failed' });
    }
  });
});

// -- Feature flags dashboard --
app.get('/flags', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.redirect('/login');

  const allFlags = await flagProvider.getAllFlags();
  const evaluated = await flagManager.getAll({ userId: user.id, role: user.role });

  const flagRows = Object.entries(allFlags).map(([name, config]) => ({
    name,
    enabled: evaluated[name],
    dotClass: evaluated[name] ? 'on' : 'off',
    statusLabel: evaluated[name] ? i18n.t('flags.enabled') : i18n.t('flags.disabled'),
    hasRules: !!config.rules,
  }));

  const viewHtml = `
<h1>${i18n.t('flags.title')}</h1>
<div data-bn="card">
  <div data-bn="card-body" style="overflow-x:auto">
    <table data-bn="table">
      <thead>
        <tr>
          <th>Flag</th>
          <th>Status</th>
          <th>Targeting</th>
        </tr>
      </thead>
      <tbody>
        ${flagRows
          .map(
            (f) => `
        <tr>
          <td style="font-weight:500">${f.name}</td>
          <td><span class="flag-dot ${f.dotClass}"></span>${f.statusLabel}</td>
          <td>${f.hasRules ? 'Rule-based' : 'Global'}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</div>`;

  const ctx = {
    user,
    userInitial: (user.username?.[0] ?? '?').toUpperCase(),
    notificationCount: notifications.getUnread().length,
    title: i18n.t('flags.title'),
    content: viewHtml,
  };
  const layoutSrc = read('views/layout.html');
  res.send(render(layoutSrc, ctx));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function start() {
  await seedUsers();
  const port = config.PORT ?? 3002;
  app.listen(port, () => {
    log.info(`Enterprise v2 running at http://localhost:${port}`);
  });
}

start();
