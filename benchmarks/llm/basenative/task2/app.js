import { signal, computed, effect, batch, hydrate } from '@basenative/runtime';

export const template = `<section>
  <p>Count: <span data-count>{{ count() }}</span></p>
  <p>Doubled: <span data-doubled>{{ doubled() }}</span></p>
  <p>Parity: <span data-parity>{{ parity() }}</span></p>
  <button type="button" data-inc @click="increment()">Increment</button>
  <button type="button" data-batch @click="addThree()">Add 3</button>
  <ul data-log>
    <template @for="entry of log(); track entry">
      <li>{{ entry }}</li>
    </template>
  </ul>
  <input data-draft :value="draft()" @input="setDraft($event.target.value)" />
  <button type="button" data-add @click="addItem()">Add item</button>
  <button type="button" data-clear @click="clearItems()">Clear items</button>
  <ul data-items>
    <template @for="item of items(); track item.id">
      <li>{{ item.text }}</li>
    </template>
    <template @empty>
      <li class="empty">No items yet</li>
    </template>
  </ul>
</section>`;

export function mount(root) {
  root.innerHTML = template;
  const count = signal(0);
  const doubled = computed(() => count() * 2);
  const parity = computed(() => (count() % 2 === 0 ? 'Even' : 'Odd'));
  const log = signal([]);
  const draft = signal('');
  const items = signal([]);
  let nextId = 1;
  effect(() => {
    log.set([...log.peek(), `count=${count()} doubled=${doubled()}`]);
  });
  const ctx = {
    count,
    doubled,
    parity,
    log,
    draft,
    items,
    increment() {
      count.set((c) => c + 1);
    },
    addThree() {
      batch(() => {
        count.set((c) => c + 1);
        count.set((c) => c + 1);
        count.set((c) => c + 1);
      });
    },
    setDraft(value) {
      draft.set(value);
    },
    addItem() {
      const text = draft().trim();
      if (!text) return;
      items.set([...items(), { id: nextId++, text }]);
      draft.set('');
    },
    clearItems() {
      items.set([]);
    },
  };
  hydrate(root, ctx);
  return ctx;
}
