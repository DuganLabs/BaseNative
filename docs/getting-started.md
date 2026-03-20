# Getting Started

## Installation

```bash
pnpm add @basenative/runtime @basenative/server
```

For forms, routing, and components:

```bash
pnpm add @basenative/forms @basenative/router @basenative/components
```

## Quick Start — SSR with Express

### 1. Create an Express server

```js
import express from 'express';
import { render } from '@basenative/server';

const app = express();

app.get('/', (req, res) => {
  const html = render(`
    <h1>Hello, {{ name }}!</h1>
    <template @if="showWelcome">
      <p>Welcome to BaseNative.</p>
    </template>
  `, {
    name: 'World',
    showWelcome: true,
  });

  res.send(`<!DOCTYPE html><html><body>${html}</body></html>`);
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

### 2. Add client-side hydration

Serve the runtime as a module:

```html
<script type="module">
  import { signal, hydrate } from '@basenative/runtime';

  const count = signal(0);

  hydrate(document.getElementById('app'), {
    count,
    increment() { count.set(c => c + 1); },
  });
</script>
```

### 3. Use template directives

```html
<div id="app">
  <p>Count: {{ count() }}</p>
  <button @click="increment()">+1</button>

  <template @for="item of items(); track item.id">
    <div>{{ item.name }}</div>
  </template>

  <template @if="count() > 5">
    <p>High count!</p>
  </template>
</div>
```

## Forms

```js
import { createField, createForm, required, email } from '@basenative/forms';

const form = createForm({
  name: createField('', { validators: [required()] }),
  email: createField('', { validators: [required(), email()] }),
}, {
  async onSubmit(values) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return res.json();
  },
});
```

## Routing

```js
import { createRouter } from '@basenative/router';

const router = createRouter([
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user-detail' },
]);

// Navigate programmatically
router.navigate('/users/42');

// Read current route reactively
effect(() => {
  console.log('Route:', router.currentRoute().name);
});
```

## Server-side Routing

```js
import { resolveRoute } from '@basenative/router';

const routes = [
  { path: '/', name: 'home', view: 'home.html' },
  { path: '/users/:id', name: 'user', view: 'user.html' },
];

app.get('*', (req, res) => {
  const match = resolveRoute(routes, req.path);
  if (!match.matched) return res.status(404).send('Not Found');

  const html = render(loadView(match.matched.view), {
    ...match.params,
    query: match.query,
  });
  res.send(html);
});
```

## Components

```js
import { renderButton, renderInput, renderTable } from '@basenative/components';

// Server-side rendering
const button = renderButton('Save', { variant: 'primary' });
const input = renderInput({ name: 'email', label: 'Email', type: 'email' });
const table = renderTable({
  columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }],
  rows: [{ name: 'Alice', role: 'Admin' }],
});
```

Include the component styles:

```html
<link rel="stylesheet" href="@basenative/components/tokens.css" />
<link rel="stylesheet" href="@basenative/components/theme.css" />
```

## Browser Support

BaseNative targets current evergreen Chrome, Edge, Firefox, and Safari. See [browser-support.md](browser-support.md).

## Next Steps

- [API Reference](api/runtime.md)
- [Components](api/components.md)
- [Roadmap](roadmap.md)
