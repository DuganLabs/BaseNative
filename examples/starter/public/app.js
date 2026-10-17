/**
 * BaseNative Starter — Client Runtime
 *
 * Each page hydrates the server-rendered HTML with reactive state.
 * Signals update only the DOM nodes that depend on them — no full re-render.
 *
 * Signals are read by calling them (count()) and written with
 * count.set(value) — there is no .get(). Handlers close over the signals
 * directly instead of relying on `this`, which hydrate() does not bind.
 */
import { hydrate, signal, computed } from '/node_modules/@basenative/runtime/src/index.js';

// ─── Counter page ─────────────────────────────────────────────────────────────
if (document.querySelector('[data-page="counter"]') || location.pathname === '/counter') {
  const count = signal(0);

  hydrate(document.querySelector('main'), {
    count,
    increment: () => count.set(n => n + 1),
    decrement: () => count.set(n => n - 1),
    reset: () => count.set(0),
  });
}

// ─── Todos page ───────────────────────────────────────────────────────────────
if (location.pathname === '/todos') {
  // Seed initial state from server-rendered data (avoids flash)
  const initialTodos = Array.from(document.querySelectorAll('[data-todo-id]')).map(el => ({
    id: parseInt(el.dataset.todoId, 10),
    text: el.dataset.todoText,
    done: el.dataset.todoDone === 'true',
  }));

  const todos = signal(initialTodos);
  const newTodo = signal('');
  const remaining = computed(() => todos().filter(t => !t.done).length);

  hydrate(document.querySelector('main'), {
    todos,
    newTodo,
    remaining,

    async addTodo(text, $event) {
      // The runtime's event binding has no .prevent modifier, so the
      // form's submit event is passed in and cancelled here.
      $event?.preventDefault();
      if (!text.trim()) return;
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const todo = await res.json();
        todos.set(ts => [...ts, todo]);
        newTodo.set('');
      }
    },

    async toggleTodo(id) {
      const res = await fetch(`/api/todos/${id}`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        todos.set(ts => ts.map(t => t.id === id ? updated : t));
      }
    },

    async deleteTodo(id) {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        todos.set(ts => ts.filter(t => t.id !== id));
      }
    },

    clearDone() {
      const done = todos().filter(t => t.done);
      Promise.all(done.map(t => fetch(`/api/todos/${t.id}`, { method: 'DELETE' }))).then(() => {
        todos.set(ts => ts.filter(t => !t.done));
      });
    },
  });
}
