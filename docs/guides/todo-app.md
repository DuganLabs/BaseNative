# Building a Todo App with BaseNative

This guide builds a complete todo app from scratch — server-rendered with live signal-based interactivity, no build step, no external frontend dependencies.

**What you'll learn:**
- Server-side rendering with `@basenative/server`
- Signal-based client hydration with `@basenative/runtime`
- Form handling with `@basenative/forms`
- Feature flags with `@basenative/flags`
- Structured logging with `@basenative/logger`

---

## Project setup

```bash
mkdir todo-app && cd todo-app
npm init -y
npm install express @basenative/server @basenative/runtime @basenative/forms @basenative/logger
```

Your `package.json` should declare `"type": "module"` for ESM:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js"
  }
}
```

---

## 1. The server

Create `server.js`:

```js
import express from 'express';
import { render } from '@basenative/server';
import { createLogger } from '@basenative/logger';

const app = express();
const logger = createLogger({ level: 'info' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store (replace with a database in production)
const todos = [
  { id: 1, text: 'Learn BaseNative signals', done: false },
  { id: 2, text: 'Build a todo app', done: false },
];
let nextId = 3;

// Serve the runtime from node_modules
app.use('/runtime', express.static('node_modules/@basenative/runtime/src'));

// ── GET / — render the todo list ──────────────────────────────────────────────

app.get('/', (req, res) => {
  const reqLogger = logger.child({ requestId: req.headers['x-request-id'] ?? 'anon' });
  reqLogger.info('rendering todo page');

  const html = render(todoTemplate(), { todos });

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BaseNative Todo</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  ${html}
  <script type="module" src="/app.js"></script>
</body>
</html>`);
});

// ── POST /todos — add a new todo ──────────────────────────────────────────────

app.post('/todos', (req, res) => {
  const text = (req.body.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const todo = { id: nextId++, text, done: false };
  todos.push(todo);
  logger.info('todo created', { id: todo.id });

  res.redirect('/');
});

// ── POST /todos/:id/toggle — mark done/undone ─────────────────────────────────

app.post('/todos/:id/toggle', (req, res) => {
  const todo = todos.find(t => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: 'not found' });

  todo.done = !todo.done;
  logger.info('todo toggled', { id: todo.id, done: todo.done });

  res.redirect('/');
});

// ── POST /todos/:id/delete — remove a todo ────────────────────────────────────

app.post('/todos/:id/delete', (req, res) => {
  const idx = todos.findIndex(t => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  todos.splice(idx, 1);
  logger.info('todo deleted', { id: req.params.id });

  res.redirect('/');
});

app.listen(3000, () => logger.info('todo app running at http://localhost:3000'));
```

---

## 2. The template

Add a `todoTemplate()` function in `server.js` (or a separate `views/todos.js`):

```js
function todoTemplate() {
  return `
    <main>
      <h1>My Todos</h1>

      <form action="/todos" method="POST" data-bn="add-form">
        <label for="todo-text">New todo</label>
        <input id="todo-text" name="text" type="text"
               placeholder="What needs doing?" required
               data-bn="new-todo-input">
        <button type="submit">Add</button>
      </form>

      <p data-bn="count">
        {{ todos.filter(t => !t.done).length }} remaining
      </p>

      <ul data-bn="todo-list">
        <template @for="todo of todos; track todo.id">
          <li data-bn="todo-item" data-id="{{ todo.id }}"
              data-done="{{ todo.done }}">
            <form action="/todos/{{ todo.id }}/toggle" method="POST"
                  style="display:contents">
              <button type="submit" aria-label="Toggle {{ todo.text }}">
                <template @if="todo.done">✓</template>
                <template @else>○</template>
              </button>
            </form>
            <span data-bn="todo-text">{{ todo.text }}</span>
            <form action="/todos/{{ todo.id }}/delete" method="POST"
                  style="display:contents">
              <button type="submit" aria-label="Delete {{ todo.text }}">×</button>
            </form>
          </li>
        </template>
        <template @empty>
          <li data-bn="empty-state">Nothing here yet — add a todo above!</li>
        </template>
      </ul>
    </main>
  `;
}
```

---

## 3. Client-side hydration

Create `public/app.js` to add live interactivity without a page reload:

```js
import { signal, computed, effect, hydrate } from '/runtime/index.js';

// ── State ─────────────────────────────────────────────────────────────────────

// Parse initial todos from the server-rendered DOM
const initialTodos = Array.from(
  document.querySelectorAll('[data-bn="todo-item"]')
).map(el => ({
  id: Number(el.dataset.id),
  done: el.dataset.done === 'true',
}));

const todos = signal(initialTodos);
const remaining = computed(() => todos().filter(t => !t.done).length);

// ── Live count ────────────────────────────────────────────────────────────────

const countEl = document.querySelector('[data-bn="count"]');
effect(() => {
  const n = remaining();
  countEl.textContent = `${n} remaining`;
});

// ── Optimistic toggle (AJAX) ──────────────────────────────────────────────────

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[action*="/toggle"]');
  if (!form) return;

  e.preventDefault();
  const id = Number(form.action.match(/\/todos\/(\d+)\/toggle/)?.[1]);
  if (!id) return;

  // Optimistically flip done state
  todos.set(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  // Sync with server in the background
  await fetch(form.action, { method: 'POST' }).catch(() => {
    // On failure, revert
    todos.set(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  });
});
```

---

## 4. Styles

Create `public/style.css` — all cascade layers, zero inline styles (BaseNative axiom):

```css
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  body {
    font-family: system-ui, sans-serif;
    max-width: 40rem;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #1a1a1a;
  }

  h1 { font-size: 1.75rem; margin-block-end: 1.5rem; }
}

@layer form {
  [data-bn="add-form"] {
    display: flex;
    gap: 0.5rem;
    margin-block-end: 1.5rem;
  }

  [data-bn="new-todo-input"] {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
}

@layer list {
  [data-bn="todo-list"] {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  [data-bn="todo-item"] {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0;
    border-block-end: 1px solid #eee;
  }

  [data-bn="todo-item"][data-done="true"] [data-bn="todo-text"] {
    text-decoration: line-through;
    opacity: 0.5;
  }

  [data-bn="todo-text"] { flex: 1; }

  [data-bn="count"] {
    font-size: 0.875rem;
    color: #666;
    margin-block-end: 0.5rem;
  }

  [data-bn="empty-state"] { color: #999; font-style: italic; }
}
```

---

## 5. Serve static files

Add this to `server.js` before the routes:

```js
app.use(express.static('public'));
```

---

## 6. Run it

```bash
node server.js
# → info: todo app running at http://localhost:3000
```

Open `http://localhost:3000`. You should see a working todo list that:
- Renders server-side on first load (works without JavaScript)
- Provides optimistic toggle via `signal()` when JavaScript is available
- Logs structured JSON for every request

---

## 7. Add a feature flag

Let's gate a "priority" feature behind a flag:

```bash
npm install @basenative/flags
```

```js
// server.js — add at the top
import { createFlagManager, createMemoryProvider } from '@basenative/flags';

const flagProvider = createMemoryProvider({
  'priority-field': { enabled: true, percentage: 50 }, // 50% rollout
});
const flags = createFlagManager(flagProvider);

// In the GET / handler, before render():
const showPriority = await flags.isEnabled('priority-field', {
  userId: req.session?.userId,
});

const html = render(todoTemplate(), { todos, showPriority });
```

Then in the template:

```html
<form action="/todos" method="POST" data-bn="add-form">
  <input name="text" type="text" placeholder="What needs doing?" required>
  <template @if="showPriority">
    <select name="priority">
      <option value="normal">Normal</option>
      <option value="high">High</option>
    </select>
  </template>
  <button type="submit">Add</button>
</form>
```

---

## 8. Add input validation

Replace the manual `text` check with `@basenative/forms`:

```bash
npm install @basenative/forms
```

```js
import { createField, createForm, required, maxLength } from '@basenative/forms';

app.post('/todos', async (req, res) => {
  const form = createForm({
    text: createField(req.body.text ?? '', {
      validators: [required(), maxLength(200)],
    }),
  });

  if (!form.valid()) {
    const errors = Object.fromEntries(
      Object.entries(form.fields).map(([k, f]) => [k, f.errors()])
    );
    return res.status(400).json({ errors });
  }

  const todo = { id: nextId++, text: form.fields.text.value(), done: false };
  todos.push(todo);
  res.redirect('/');
});
```

---

## What's next

| Enhancement | Package |
|-------------|---------|
| Persist todos to SQLite | `@basenative/db` |
| Add user accounts | `@basenative/auth` |
| Real-time sync across tabs | `@basenative/realtime` |
| Email notifications | `@basenative/notify` |
| Deploy to Cloudflare Workers | `@basenative/server` + Workers adapter |

See `examples/express/` for a complete running example with all of these patterns assembled.
