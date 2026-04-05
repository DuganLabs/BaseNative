/**
 * BaseNative Starter — Client Runtime
 *
 * Each page hydrates the server-rendered HTML with reactive state.
 * Signals update only the DOM nodes that depend on them — no full re-render.
 */
import { hydrate, signal, computed } from '/node_modules/@basenative/runtime/src/index.js';

// ─── Counter page ─────────────────────────────────────────────────────────────
if (document.querySelector('[data-page="counter"]') || location.pathname === '/counter') {
  hydrate(document.querySelector('main'), {
    count: signal(0),

    increment() { this.count.set(n => n + 1); },
    decrement() { this.count.set(n => n - 1); },
    reset()     { this.count.set(0); },
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

  hydrate(document.querySelector('main'), {
    todos: signal(initialTodos),
    newTodo: signal(''),

    remaining: computed(function() {
      return this.todos.get().filter(t => !t.done).length;
    }),

    async addTodo(text) {
      if (!text.trim()) return;
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const todo = await res.json();
        this.todos.set(ts => [...ts, todo]);
        this.newTodo.set('');
      }
    },

    async toggleTodo(id) {
      const res = await fetch(`/api/todos/${id}`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        this.todos.set(ts => ts.map(t => t.id === id ? updated : t));
      }
    },

    async deleteTodo(id) {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        this.todos.set(ts => ts.filter(t => t.id !== id));
      }
    },

    clearDone() {
      const done = this.todos.get().filter(t => t.done);
      Promise.all(done.map(t => fetch(`/api/todos/${t.id}`, { method: 'DELETE' }))).then(() => {
        this.todos.set(ts => ts.filter(t => !t.done));
      });
    },
  });
}
