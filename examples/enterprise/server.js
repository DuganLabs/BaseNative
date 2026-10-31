import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';
import { escapeText } from '@basenative/runtime/shared/escape';
import { loadRegistry, renderComponent } from '@basenative/components';

/* The Holy Trinity catalog: components render through the registry
   with the server renderer, never through string-builder helpers. */
const registry = await loadRegistry();
const component = (name, props) => renderComponent(registry, render, name, props).html;

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const pkgRoot = join(__dirname, '..', '..');
app.use('/bn-css', express.static(join(pkgRoot, 'packages', 'components', 'src')));

// -- In-memory data store --
let nextId = 4;
let users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'active' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'Viewer', status: 'inactive' },
];

// -- Layout --
function renderPage(viewFile, ctx, title) {
  const layout = read('views/layout.html');
  const view = read(`views/${viewFile}`);
  const content = render(view, ctx);
  return layout
    // `title` can be user-controlled (e.g. a user's own name on
    // /users/:id) and lands in the page unescaped otherwise — the same
    // escaping @basenative/server applies to `{{ }}` interpolation.
    .replace('<!--TITLE-->', escapeText(title))
    .replace('<!--CONTENT-->', content);
}

// -- Routes --
app.get('/', (_req, res) => {
  const ctx = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    statsCard1: component('card', { title: 'Total Users', body: String(users.length) }),
    statsCard2: component('card', { title: 'Active Users', body: String(users.filter(u => u.status === 'active').length) }),
    statsCard3: component('card', { title: 'Roles', body: String(new Set(users.map(u => u.role)).size) }),
    recentActivity: component('alert', { title: 'Application ready', body: 'All systems operational.', variant: 'success' }),
  };
  res.send(renderPage('dashboard.html', ctx, 'Dashboard'));
});

app.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const totalPages = Math.ceil(users.length / perPage);
  const pageUsers = users.slice((page - 1) * perPage, page * perPage);

  const ctx = {
    usersTable: component('table', {
      columns: ['Name', 'Email', 'Role', 'Status'],
      rows: pageUsers.map(u => [
        u.name,
        u.email,
        u.role,
        { contentHtml: component('badge', { label: u.status, variant: u.status === 'active' ? 'success' : 'default' }) },
      ]),
      caption: 'User Management',
    }),
    pagination: component('pagination', { page, pages: totalPages, hrefFor: (p) => `/users?page=${p}` }),
    addButton: component('button', { label: 'Add User', variant: 'primary' }),
  };
  res.send(renderPage('users.html', ctx, 'Users'));
});

app.get('/users/new', (_req, res) => {
  const ctx = {
    nameInput: component('field', {
      label: 'Full Name', controlId: 'name',
      controlHtml: component('input', { id: 'name', type: 'text' }),
    }),
    emailInput: component('field', {
      label: 'Email', controlId: 'email',
      controlHtml: component('input', { id: 'email', type: 'email' }),
    }),
    roleSelect: component('field', {
      label: 'Role', controlId: 'role',
      controlHtml: component('select', {
        id: 'role', name: 'role', variant: 'native',
        options: [
          { value: 'Admin', label: 'Admin' },
          { value: 'Editor', label: 'Editor' },
          { value: 'Viewer', label: 'Viewer' },
        ],
      }),
    }),
    submitButton: component('button', { label: 'Create User', variant: 'primary', type: 'submit' }),
    cancelButton: component('button', { label: 'Cancel' }),
  };
  res.send(renderPage('user-form.html', ctx, 'New User'));
});

app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).send('User not found');

  const ctx = {
    user,
    statusBadge: component('badge', { label: user.status, variant: user.status === 'active' ? 'success' : 'default' }),
    editButton: component('button', { label: 'Edit' }),
    deleteButton: component('button', { label: 'Delete', variant: 'destructive' }),
  };
  res.send(renderPage('user-detail.html', ctx, user.name));
});

// -- API --
app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const user = { id: nextId++, name, email, role: role || 'Viewer', status: 'active' };
  users.push(user);
  res.status(201).json(user);
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  users.splice(idx, 1);
  res.status(204).end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enterprise Example → http://localhost:${PORT}`);
});
