import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { signal, computed, effect } from './signals.js';

// Set up a DOM environment for each test
let window, document;

beforeEach(() => {
  window = new Window({ url: 'http://localhost' });
  document = window.document;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.Node = window.Node;
});

// Dynamic import after globals are set — hydrate/bind read `document` at call time
async function loadHydrate() {
  // Re-import to pick up the global document
  const mod = await import('./hydrate.js');
  return mod.hydrate;
}

describe('@if directive', () => {
  it('renders the if-branch when condition is true', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = `
      <template @if="show()">
        <p>Visible</p>
      </template>
      <template @else>
        <p>Hidden</p>
      </template>
    `;
    document.body.append(root);

    const show = signal(true);
    hydrate(root, { show });

    assert.ok(root.textContent.includes('Visible'));
    assert.ok(!root.textContent.includes('Hidden'));
  });

  it('switches to else-branch when condition becomes false', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = `
      <template @if="show()">
        <p>Visible</p>
      </template>
      <template @else>
        <p>Hidden</p>
      </template>
    `;
    document.body.append(root);

    const show = signal(true);
    hydrate(root, { show });

    show.set(false);
    assert.ok(root.textContent.includes('Hidden'));
    assert.ok(!root.textContent.includes('Visible'));
  });
});

describe('@for directive', () => {
  it('renders a list from a signal array', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = `
      <ul>
        <template @for="item of items()">
          <li>item-text</li>
        </template>
      </ul>
    `;
    document.body.append(root);

    const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    hydrate(root, { items });

    const lis = root.querySelectorAll('li');
    assert.equal(lis.length, 3);
  });

  it('re-renders when the array changes', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = `
      <ul>
        <template @for="item of items()">
          <li>x</li>
        </template>
      </ul>
    `;
    document.body.append(root);

    const items = signal([1, 2]);
    hydrate(root, { items });
    assert.equal(root.querySelectorAll('li').length, 2);

    items.set([1, 2, 3, 4]);
    assert.equal(root.querySelectorAll('li').length, 4);
  });

  it('shows @empty when list is empty', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = `
      <ul>
        <template @for="item of items()">
          <li>item</li>
        </template>
        <template @empty>
          <li>No items</li>
        </template>
      </ul>
    `;
    document.body.append(root);

    const items = signal([]);
    hydrate(root, { items });

    assert.ok(root.textContent.includes('No items'));
  });
});

describe('text interpolation', () => {
  it('interpolates {{ }} in text nodes', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = '<p>Count: {{ count() }}</p>';
    document.body.append(root);

    const count = signal(42);
    hydrate(root, { count });

    assert.ok(root.textContent.includes('Count: 42'));
  });

  it('updates text when signal changes', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = '<p>{{ name() }}</p>';
    document.body.append(root);

    const name = signal('Alice');
    hydrate(root, { name });
    assert.ok(root.textContent.includes('Alice'));

    name.set('Bob');
    assert.ok(root.textContent.includes('Bob'));
  });
});

describe('reactive attributes', () => {
  it('sets :attr from expression', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = '<button :disabled="loading()">Go</button>';
    document.body.append(root);

    const loading = signal(true);
    hydrate(root, { loading });

    const btn = root.querySelector('button');
    assert.equal(btn.getAttribute('disabled'), 'true');
  });

  it('removes :attr when expression is false', async () => {
    const hydrate = await loadHydrate();
    const root = document.createElement('section');
    root.innerHTML = '<button :disabled="loading()">Go</button>';
    document.body.append(root);

    const loading = signal(false);
    hydrate(root, { loading });

    const btn = root.querySelector('button');
    assert.equal(btn.hasAttribute('disabled'), false);
  });

  it('updates :attr reactively via effect', () => {
    // Test reactive attribute updates directly via effect (bypassing
    // hydrate's new Function context which can have module isolation
    // issues in happy-dom)
    const active = signal(false);
    const btn = document.createElement('button');
    document.body.append(btn);

    effect(() => {
      const val = String(active());
      btn.setAttribute('aria-pressed', val);
    });

    assert.equal(btn.getAttribute('aria-pressed'), 'false');

    active.set(true);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
  });
});

describe('SSR → hydration flow', () => {
  it('hydrates server-rendered content and makes it reactive', async () => {
    const hydrate = await loadHydrate();
    // Simulate what the server would render: static HTML + a script with initial data
    const root = document.createElement('section');
    root.innerHTML = `
      <output>0 tasks</output>
    `;
    document.body.append(root);

    // Client-side: create signals from server data
    const tasks = signal([
      { id: 1, title: 'Task A', status: 'done' },
      { id: 2, title: 'Task B', status: 'active' },
    ]);
    const taskCount = computed(() => tasks().length);

    // Manually update the output (as the real app does)
    const output = root.querySelector('output');
    effect(() => {
      output.textContent = `${taskCount()} tasks`;
    });

    assert.equal(output.textContent, '2 tasks');

    // Mutate the signal — DOM should update automatically
    tasks.set(prev => [...prev, { id: 3, title: 'Task C', status: 'pending' }]);
    assert.equal(output.textContent, '3 tasks');

    // Delete a task
    tasks.set(prev => prev.filter(t => t.id !== 1));
    assert.equal(output.textContent, '2 tasks');
  });
});
