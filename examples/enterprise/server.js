import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';
import { resolveRoute } from '@basenative/router';
import {
  renderButton,
  renderInput,
  renderSelect,
  renderTable,
  renderPagination,
  renderAlert,
  renderBadge,
  renderCard,
} from '@basenative/components';

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

// -- Route definitions --
const routes = [
  { path: '/', name: 'dashboard' },
  { path: '/users', name: 'users' },
  { path: '/users/new', name: 'user-create' },
  { path: '/users/:id', name: 'user-detail' },
];

// -- Layout --
function renderPage(viewFile, ctx, title) {
  const layout = read('views/layout.html');
  const view = read(`views/${viewFile}`);
  const content = render(view, ctx);
  return layout
    .replace('<!--TITLE-->', title)
    .replace('<!--CONTENT-->', content);
}

// -- Routes --
app.get('/', (_req, res) => {
  const ctx = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    statsCard1: renderCard({ header: 'Total Users', body: `<p style="font-size:2rem;font-weight:700">${users.length}</p>` }),
    statsCard2: renderCard({ header: 'Active Users', body: `<p style="font-size:2rem;font-weight:700">${users.filter(u => u.status === 'active').length}</p>` }),
    statsCard3: renderCard({ header: 'Roles', body: `<p style="font-size:2rem;font-weight:700">${new Set(users.map(u => u.role)).size}</p>` }),
    recentActivity: renderAlert('Application ready. All systems operational.', { variant: 'success' }),
  };
  res.send(renderPage('dashboard.html', ctx, 'Dashboard'));
});

app.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const totalPages = Math.ceil(users.length / perPage);
  const pageUsers = users.slice((page - 1) * perPage, page * perPage);

  const ctx = {
    usersTable: renderTable({
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'statusBadge', label: 'Status' },
      ],
      rows: pageUsers.map(u => ({
        ...u,
        statusBadge: renderBadge(u.status, { variant: u.status === 'active' ? 'success' : 'default' }),
      })),
      emptyMessage: 'No users found',
      caption: 'User Management',
    }),
    pagination: renderPagination({ currentPage: page, totalPages, baseUrl: '/users' }),
    addButton: renderButton('Add User', { variant: 'primary' }),
  };
  res.send(renderPage('users.html', ctx, 'Users'));
});

app.get('/users/new', (_req, res) => {
  const ctx = {
    nameInput: renderInput({ name: 'name', label: 'Full Name', required: true }),
    emailInput: renderInput({ name: 'email', label: 'Email', type: 'email', required: true }),
    roleSelect: renderSelect({
      name: 'role',
      label: 'Role',
      placeholder: 'Select a role',
      items: [
        { value: 'Admin', label: 'Admin' },
        { value: 'Editor', label: 'Editor' },
        { value: 'Viewer', label: 'Viewer' },
      ],
    }),
    submitButton: renderButton('Create User', { variant: 'primary', type: 'submit' }),
    cancelButton: renderButton('Cancel', { variant: 'secondary' }),
  };
  res.send(renderPage('user-form.html', ctx, 'New User'));
});

app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).send('User not found');

  const ctx = {
    user,
    statusBadge: renderBadge(user.status, { variant: user.status === 'active' ? 'success' : 'default' }),
    editButton: renderButton('Edit', { variant: 'secondary' }),
    deleteButton: renderButton('Delete', { variant: 'destructive' }),
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
