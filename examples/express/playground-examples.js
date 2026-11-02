/**
 * The playground's five examples, as data.
 *
 * Each example is written to the Holy Trinity standard the playground
 * teaches:
 *
 * - HTML is semantic and classless, and holds NO display strings — every
 *   heading, label, caption and note lives in the JS view model (the
 *   `copy` object and the computeds), and attribute strings arrive
 *   through bindings (:placeholder, :aria-label, :value).
 * - CSS custom properties are CTI+ names only: category-first,
 *   hyphen-joined (Category–Type–Item–Variant–Subitem–State), no domain
 *   prefix, no underscores, and every declaration value is a var().
 *   Component parts are addressed as items (card-label, card-button…).
 * - JS owns all data; mount(ctx) hydrates the template.
 *
 * The strings here are the prototype's final versions — same visible
 * text, same behaviours, same console lines.
 */

const COUNTER = {
  id: 'counter',
  label: 'Counter — signals, {{ }}, @if / @else',
  html: `<section variant="card">
  <header>
    <p>{{ copy.heading }}</p>
  </header>
  <output>{{ count() }}</output>
  <p>
    <button @click="dec()">{{ copy.dec }}</button>
    <button @click="inc()">{{ copy.inc }}</button>
    <button @click="reset()">{{ copy.reset }}</button>
  </p>
  <footer>
    <template @if="count() >= 10">
      <p>{{ copy.ready }}</p>
    </template>
    <template @else>
      <p>{{ doubledNote() }}</p>
    </template>
  </footer>
</section>
`,
  js: `// signal, computed, effect, batch, raw, hydrate and mount are in scope.
// mount(ctx) hydrates your HTML (the #app root) with diagnostics on.
const count = signal(0);
const doubled = computed(() => count() * 2);
const doubledNote = computed(
  () => 'Doubled: ' + doubled() + ' — a computed() tracking count().'
);

const copy = {
  heading: 'Counter',
  inc: '+',
  dec: '−',
  reset: 'Reset',
  ready: 'Double digits — the @if branch is rendering.',
};

mount({
  count,
  doubled,
  doubledNote,
  copy,
  inc: () => count.set(c => c + 1),
  dec: () => count.set(c => c - 1),
  reset: () => count.set(0),
});

// effect() re-runs whenever a signal it read changes: every click
// logs a line here.
effect(() => console.log('count = ' + count() + ' · doubled = ' + doubled()));

console.log('Counter mounted. Click + a few times, then watch the @if branch flip at 10.');
`,
  css: `:root {
  --size-width-card: 340px;
  --spacing-margin-card: 24px auto;
  --spacing-padding-card: 20px;
  --size-border-card: 1px;
  --keyword-border-card: solid;
  --color-border-card: #8885;
  --size-radius-card: 12px;
  --keyword-align-card: center;
  --spacing-margin-card-label: 0;
  --font-size-card-label: 12px;
  --font-spacing-card-label: 0.12em;
  --keyword-transform-card-label: uppercase;
  --number-opacity-card-label: 0.6;
  --keyword-display-card-value: block;
  --font-size-card-value: 56px;
  --font-weight-card-value: 700;
  --font-leading-card-value: 1.15;
  --keyword-display-card-actions: flex;
  --spacing-gap-card-actions: 8px;
  --keyword-justify-card-actions: center;
  --spacing-padding-card-button: 7px 16px;
  --size-border-card-button: 1px;
  --keyword-border-card-button: solid;
  --color-border-card-button: #8886;
  --size-radius-card-button: 8px;
  --color-bkg-card-button: transparent;
  --color-text-card-button: inherit;
  --font-size-card-note: 13.5px;
  --number-opacity-card-note: 0.75;
  --spacing-margin-card-note: 0;
}

section[variant="card"] {
  max-width: var(--size-width-card);
  margin: var(--spacing-margin-card);
  padding: var(--spacing-padding-card);
  border: var(--size-border-card) var(--keyword-border-card) var(--color-border-card);
  border-radius: var(--size-radius-card);
  text-align: var(--keyword-align-card);
}
section[variant="card"] > header p {
  margin: var(--spacing-margin-card-label);
  font-size: var(--font-size-card-label);
  letter-spacing: var(--font-spacing-card-label);
  text-transform: var(--keyword-transform-card-label);
  opacity: var(--number-opacity-card-label);
}
section[variant="card"] > output {
  display: var(--keyword-display-card-value);
  font-size: var(--font-size-card-value);
  font-weight: var(--font-weight-card-value);
  line-height: var(--font-leading-card-value);
}
section[variant="card"] > p {
  display: var(--keyword-display-card-actions);
  gap: var(--spacing-gap-card-actions);
  justify-content: var(--keyword-justify-card-actions);
}
section[variant="card"] > p button {
  padding: var(--spacing-padding-card-button);
  border: var(--size-border-card-button) var(--keyword-border-card-button) var(--color-border-card-button);
  border-radius: var(--size-radius-card-button);
  background: var(--color-bkg-card-button);
  color: var(--color-text-card-button);
}
section[variant="card"] > footer p {
  font-size: var(--font-size-card-note);
  opacity: var(--number-opacity-card-note);
  margin-bottom: var(--spacing-margin-card-note);
}
`,
};

const TODOS = {
  id: 'todos',
  label: 'Task list — @for with track, @empty',
  html: `<section variant="card">
  <header>
    <h2>{{ copy.heading }}</h2>
    <p>
      <input id="task-input" :placeholder="copy.placeholder" :aria-label="copy.inputLabel"
        @input="setDraft($event.target.value)"
        @keydown="addOnEnter($event)">
      <button @click="add()">{{ copy.add }}</button>
    </p>
  </header>
  <ul>
    <template @for="task of tasks(); track task.id">
      <li>
        <button :aria-pressed="task.done" @click="toggle(task.id)">{{ statusLabel(task) }}</button>
        <p>{{ task.title }}</p>
        <button @click="remove(task.id)">{{ copy.remove }}</button>
      </li>
    </template>
    <template @empty>
      <li>{{ copy.empty }}</li>
    </template>
  </ul>
  <footer>
    <p>{{ summary() }}</p>
  </footer>
</section>
`,
  js: `let nextId = 4;
const draft = signal('');
const tasks = signal([
  { id: 1, title: 'Wire the lead form to the CRM', done: true },
  { id: 2, title: 'Review the quote template', done: false },
  { id: 3, title: 'Call the supplier back', done: false },
]);
const remaining = computed(() => tasks().filter(t => !t.done).length);
const summary = computed(
  () => remaining() + ' remaining · ' + tasks().length + ' total'
);

const copy = {
  heading: 'Field tasks',
  placeholder: 'Add a task and press Enter',
  inputLabel: 'New task',
  add: 'Add',
  remove: 'Remove',
  done: 'Done',
  todo: 'To do',
  empty: 'List is empty — this is the @empty template rendering.',
};
const statusLabel = (task) => (task.done ? copy.done : copy.todo);

function add() {
  const title = draft().trim();
  if (!title) return;
  tasks.set(list => [...list, { id: nextId++, title: title, done: false }]);
  draft.set('');
  const input = document.getElementById('task-input');
  input.value = '';
  input.focus();
}

function toggle(id) {
  tasks.set(list => list.map(t => t.id === id ? { ...t, done: !t.done } : t));
}

function remove(id) {
  tasks.set(list => list.filter(t => t.id !== id));
}

mount({
  draft,
  tasks,
  remaining,
  summary,
  copy,
  statusLabel,
  setDraft: (v) => draft.set(v),
  add,
  addOnEnter: (e) => { if (e && e.key === 'Enter') add(); },
  toggle,
  remove,
});

console.log('@for is keyed by track task.id — toggling re-renders one row, not the list.');
`,
  css: `:root {
  --size-width-card: 430px;
  --spacing-margin-card: 24px auto;
  --spacing-padding-card: 20px 22px;
  --size-border-card: 1px;
  --keyword-border-card: solid;
  --color-border-card: #8885;
  --size-radius-card: 12px;
  --spacing-margin-card-title: 0 0 12px;
  --font-size-card-title: 19px;
  --keyword-display-card-entry: flex;
  --spacing-gap-card-entry: 8px;
  --spacing-margin-card-entry: 0 0 6px;
  --size-flex-card-input: 1;
  --size-min-width-card-input: 0;
  --spacing-padding-card-input: 8px 10px;
  --size-border-card-input: 1px;
  --keyword-border-card-input: solid;
  --color-border-card-input: #8886;
  --size-radius-card-input: 8px;
  --color-bkg-card-input: transparent;
  --color-text-card-input: inherit;
  --spacing-padding-card-button: 6px 12px;
  --size-border-card-button: 1px;
  --keyword-border-card-button: solid;
  --color-border-card-button: #8886;
  --size-radius-card-button: 8px;
  --color-bkg-card-button: transparent;
  --color-text-card-button: inherit;
  --keyword-style-card-list: none;
  --spacing-margin-card-list: 10px 0;
  --spacing-padding-card-list: 0;
  --keyword-display-card-item: flex;
  --keyword-align-card-item: center;
  --spacing-gap-card-item: 10px;
  --spacing-padding-card-item: 8px 0;
  --size-border-card-item: 1px;
  --keyword-border-card-item: solid;
  --color-border-card-item: #8883;
  --size-flex-card-item-title: 1;
  --spacing-margin-card-item-title: 0;
  --keyword-decoration-card-item-title-done: line-through;
  --number-opacity-card-item-title-done: 0.55;
  --size-min-width-card-toggle: 64px;
  --font-size-card-toggle: 12.5px;
  --font-size-card-remove: 12.5px;
  --number-opacity-card-remove: 0.75;
  --keyword-display-card-empty: block;
  --spacing-padding-card-empty: 12px 0;
  --keyword-border-card-empty: none;
  --number-opacity-card-empty: 0.65;
  --font-size-card-empty: 14px;
  --font-size-card-note: 13px;
  --number-opacity-card-note: 0.7;
  --spacing-margin-card-note: 0;
}

section[variant="card"] {
  max-width: var(--size-width-card);
  margin: var(--spacing-margin-card);
  padding: var(--spacing-padding-card);
  border: var(--size-border-card) var(--keyword-border-card) var(--color-border-card);
  border-radius: var(--size-radius-card);
}
section[variant="card"] > header h2 {
  margin: var(--spacing-margin-card-title);
  font-size: var(--font-size-card-title);
}
section[variant="card"] > header p {
  display: var(--keyword-display-card-entry);
  gap: var(--spacing-gap-card-entry);
  margin: var(--spacing-margin-card-entry);
}
section[variant="card"] > header input {
  flex: var(--size-flex-card-input);
  min-width: var(--size-min-width-card-input);
  padding: var(--spacing-padding-card-input);
  border: var(--size-border-card-input) var(--keyword-border-card-input) var(--color-border-card-input);
  border-radius: var(--size-radius-card-input);
  background: var(--color-bkg-card-input);
  color: var(--color-text-card-input);
}
section[variant="card"] button {
  padding: var(--spacing-padding-card-button);
  border: var(--size-border-card-button) var(--keyword-border-card-button) var(--color-border-card-button);
  border-radius: var(--size-radius-card-button);
  background: var(--color-bkg-card-button);
  color: var(--color-text-card-button);
}
section[variant="card"] > ul {
  list-style: var(--keyword-style-card-list);
  margin: var(--spacing-margin-card-list);
  padding: var(--spacing-padding-card-list);
}
section[variant="card"] > ul > li {
  display: var(--keyword-display-card-item);
  align-items: var(--keyword-align-card-item);
  gap: var(--spacing-gap-card-item);
  padding: var(--spacing-padding-card-item);
  border-bottom: var(--size-border-card-item) var(--keyword-border-card-item) var(--color-border-card-item);
}
section[variant="card"] > ul > li > p {
  flex: var(--size-flex-card-item-title);
  margin: var(--spacing-margin-card-item-title);
}
section[variant="card"] > ul > li > button[aria-pressed="true"] + p {
  text-decoration: var(--keyword-decoration-card-item-title-done);
  opacity: var(--number-opacity-card-item-title-done);
}
section[variant="card"] > ul > li > button:first-of-type {
  min-width: var(--size-min-width-card-toggle);
  font-size: var(--font-size-card-toggle);
}
section[variant="card"] > ul > li > button:last-of-type {
  font-size: var(--font-size-card-remove);
  opacity: var(--number-opacity-card-remove);
}
section[variant="card"] > ul > li:not(:has(> button)) {
  display: var(--keyword-display-card-empty);
  padding: var(--spacing-padding-card-empty);
  border-bottom: var(--keyword-border-card-empty);
  opacity: var(--number-opacity-card-empty);
  font-size: var(--font-size-card-empty);
}
section[variant="card"] > footer p {
  font-size: var(--font-size-card-note);
  opacity: var(--number-opacity-card-note);
  margin-bottom: var(--spacing-margin-card-note);
}
`,
};

const GREETING = {
  id: 'greeting',
  label: 'Greeter — computed chains, @else',
  html: `<section variant="card">
  <header>
    <p>{{ copy.heading }}</p>
  </header>
  <h2>{{ greeting() }}</h2>
  <p>
    <label>{{ copy.firstLabel }}
      <input :value="first()" @input="setFirst($event.target.value)">
    </label>
    <label>{{ copy.lastLabel }}
      <input :value="last()" @input="setLast($event.target.value)">
    </label>
  </p>
  <footer>
    <template @if="fullName()">
      <p>{{ copy.fullNamePrefix }}<strong>{{ fullName() }}</strong>{{ charSuffix() }}</p>
    </template>
    <template @else>
      <p>{{ copy.emptyNote }}</p>
    </template>
  </footer>
</section>
`,
  js: `const first = signal('Ada');
const last = signal('Lovelace');

// computed() values are signals too — templates call them the same way.
const fullName = computed(() => [first(), last()].filter(Boolean).join(' '));
const greeting = computed(() =>
  fullName() ? 'Hello, ' + fullName() + '.' : 'Hello — who goes there?'
);
const charSuffix = computed(() => ' · ' + fullName().length + ' characters');

const copy = {
  heading: 'Greeter',
  firstLabel: 'First name',
  lastLabel: 'Last name',
  fullNamePrefix: 'Full name: ',
  emptyNote: 'Both fields are empty, so the @else branch is rendering. Type a name to flip it.',
};

mount({
  first,
  last,
  fullName,
  greeting,
  charSuffix,
  copy,
  setFirst: (v) => first.set(v),
  setLast: (v) => last.set(v),
});
`,
  css: `:root {
  --size-width-card: 430px;
  --spacing-margin-card: 24px auto;
  --spacing-padding-card: 20px 22px;
  --size-border-card: 1px;
  --keyword-border-card: solid;
  --color-border-card: #8885;
  --size-radius-card: 12px;
  --spacing-margin-card-label: 0;
  --font-size-card-label: 12px;
  --font-spacing-card-label: 0.12em;
  --keyword-transform-card-label: uppercase;
  --number-opacity-card-label: 0.6;
  --spacing-margin-card-greeting: 6px 0 14px;
  --font-size-card-greeting: 24px;
  --keyword-display-card-fields: flex;
  --spacing-gap-card-fields: 12px;
  --keyword-wrap-card-fields: wrap;
  --spacing-margin-card-fields: 0;
  --size-flex-card-field: 1;
  --size-min-width-card-field: 150px;
  --font-size-card-field: 13px;
  --number-opacity-card-field: 0.9;
  --keyword-display-card-input: block;
  --size-width-card-input: 100%;
  --spacing-margin-card-input: 5px;
  --spacing-padding-card-input: 8px 10px;
  --size-border-card-input: 1px;
  --keyword-border-card-input: solid;
  --color-border-card-input: #8886;
  --size-radius-card-input: 8px;
  --color-bkg-card-input: transparent;
  --color-text-card-input: inherit;
  --font-size-card-note: 13.5px;
  --number-opacity-card-note: 0.75;
  --spacing-margin-card-note: 0;
}

section[variant="card"] {
  max-width: var(--size-width-card);
  margin: var(--spacing-margin-card);
  padding: var(--spacing-padding-card);
  border: var(--size-border-card) var(--keyword-border-card) var(--color-border-card);
  border-radius: var(--size-radius-card);
}
section[variant="card"] > header p {
  margin: var(--spacing-margin-card-label);
  font-size: var(--font-size-card-label);
  letter-spacing: var(--font-spacing-card-label);
  text-transform: var(--keyword-transform-card-label);
  opacity: var(--number-opacity-card-label);
}
section[variant="card"] > h2 {
  margin: var(--spacing-margin-card-greeting);
  font-size: var(--font-size-card-greeting);
}
section[variant="card"] > p {
  display: var(--keyword-display-card-fields);
  gap: var(--spacing-gap-card-fields);
  flex-wrap: var(--keyword-wrap-card-fields);
  margin: var(--spacing-margin-card-fields);
}
section[variant="card"] > p label {
  flex: var(--size-flex-card-field);
  min-width: var(--size-min-width-card-field);
  font-size: var(--font-size-card-field);
  opacity: var(--number-opacity-card-field);
}
section[variant="card"] > p input {
  display: var(--keyword-display-card-input);
  width: var(--size-width-card-input);
  margin-top: var(--spacing-margin-card-input);
  padding: var(--spacing-padding-card-input);
  border: var(--size-border-card-input) var(--keyword-border-card-input) var(--color-border-card-input);
  border-radius: var(--size-radius-card-input);
  background: var(--color-bkg-card-input);
  color: var(--color-text-card-input);
}
section[variant="card"] > footer p {
  font-size: var(--font-size-card-note);
  opacity: var(--number-opacity-card-note);
  margin-bottom: var(--spacing-margin-card-note);
}
`,
};

const TABS = {
  id: 'tabs',
  label: 'Tabs — @switch / @case / @default',
  html: `<section variant="card">
  <nav>
    <button :aria-pressed="tab() === 'why'" @click="show('why')">{{ copy.whyTab }}</button>
    <button :aria-pressed="tab() === 'syntax'" @click="show('syntax')">{{ copy.syntaxTab }}</button>
    <button :aria-pressed="tab() === 'safety'" @click="show('safety')">{{ copy.safetyTab }}</button>
  </nav>
  <template @switch="tab()">
    <template @case="'why'">
      <p>{{ copy.why }}</p>
    </template>
    <template @case="'syntax'">
      <p>{{ copy.syntax }}</p>
    </template>
    <template @case="'safety'">
      <p>{{ copy.safety }}</p>
    </template>
    <template @default>
      <p>{{ copy.pick }}</p>
    </template>
  </template>
</section>
`,
  js: `const tab = signal('why');

const copy = {
  whyTab: 'Why',
  syntaxTab: 'Syntax',
  safetyTab: 'Safety',
  why: 'Templates are strings rendered at runtime — no compiler, no build step. A page, a CMS, or a model can hand BaseNative a template and it renders immediately, then hydrates in place.',
  syntax: 'Control flow lives on <template>: @if / @else, @for with track, @switch / @case / @default. Text uses {{ }}, attributes use :name, events use @event.',
  safety: 'Template expressions run through a hand-written parser — never eval, never the Function constructor. Access to constructor, prototype, and __proto__ is blocked, so templates stay safe under a strict CSP.',
  pick: 'Pick a tab.',
};

mount({
  tab,
  copy,
  show: (name) => tab.set(name),
});

console.log('@switch renders the @case whose value equals tab() — currently', tab());
`,
  css: `:root {
  --size-width-card: 460px;
  --spacing-margin-card: 24px auto;
  --spacing-padding-card: 20px 22px;
  --size-border-card: 1px;
  --keyword-border-card: solid;
  --color-border-card: #8885;
  --size-radius-card: 12px;
  --keyword-display-card-nav: flex;
  --spacing-gap-card-nav: 6px;
  --spacing-margin-card-nav: 0 0 8px;
  --font-size-card-nav: 14.5px;
  --font-leading-card-nav: 1.6;
  --spacing-padding-card-tab: 7px 14px;
  --size-border-card-tab: 1px;
  --keyword-border-card-tab: solid;
  --color-border-card-tab: transparent;
  --size-radius-card-tab: 999px;
  --color-bkg-card-tab: transparent;
  --color-text-card-tab: inherit;
  --number-opacity-card-tab: 0.65;
  --color-border-card-tab-current: #8887;
  --number-opacity-card-tab-current: 1;
  --font-weight-card-tab-current: 600;
  --font-size-card-body: 14.5px;
  --font-leading-card-body: 1.6;
}

section[variant="card"] {
  max-width: var(--size-width-card);
  margin: var(--spacing-margin-card);
  padding: var(--spacing-padding-card);
  border: var(--size-border-card) var(--keyword-border-card) var(--color-border-card);
  border-radius: var(--size-radius-card);
}
section[variant="card"] > nav {
  display: var(--keyword-display-card-nav);
  gap: var(--spacing-gap-card-nav);
  margin: var(--spacing-margin-card-nav);
  font-size: var(--font-size-card-nav);
  line-height: var(--font-leading-card-nav);
}
section[variant="card"] > nav button {
  padding: var(--spacing-padding-card-tab);
  border: var(--size-border-card-tab) var(--keyword-border-card-tab) var(--color-border-card-tab);
  border-radius: var(--size-radius-card-tab);
  background: var(--color-bkg-card-tab);
  color: var(--color-text-card-tab);
  opacity: var(--number-opacity-card-tab);
}
section[variant="card"] > nav button[aria-pressed="true"] {
  border-color: var(--color-border-card-tab-current);
  opacity: var(--number-opacity-card-tab-current);
  font-weight: var(--font-weight-card-tab-current);
}
section[variant="card"] > p {
  font-size: var(--font-size-card-body);
  line-height: var(--font-leading-card-body);
}
`,
};

const FILTER = {
  id: 'filter',
  label: 'Package filter — computed over a list',
  html: `<section variant="card">
  <header>
    <h2>{{ copy.heading }}</h2>
    <p>
      <input :placeholder="copy.placeholder" :aria-label="copy.inputLabel" @input="setQuery($event.target.value)">
    </p>
  </header>
  <ul>
    <template @for="pkg of results()">
      <li><strong>{{ pkg.name }}</strong><p>{{ pkg.desc }}</p></li>
    </template>
    <template @empty>
      <li>{{ emptyLine() }}</li>
    </template>
  </ul>
  <footer>
    <p>{{ countLine() }}</p>
  </footer>
</section>
`,
  js: `const query = signal('');
const packages = signal([
  { name: '@basenative/runtime', desc: 'Signal-based web runtime over native HTML' },
  { name: '@basenative/server', desc: 'Server-side rendering with streaming support' },
  { name: '@basenative/components', desc: 'Semantic HTML UI components rendered as strings' },
  { name: '@basenative/router', desc: 'SSR-aware path routing with named params' },
  { name: '@basenative/forms', desc: 'Signal-based form state with validation' },
  { name: '@basenative/date', desc: 'Date utilities, timezone handling, relative time' },
]);

const results = computed(() => {
  const q = query().trim().toLowerCase();
  if (!q) return packages();
  return packages().filter(p => (p.name + ' ' + p.desc).toLowerCase().includes(q));
});
const emptyLine = computed(() => 'No package matches “' + query() + '”.');
const countLine = computed(
  () => results().length + ' of ' + packages().length + ' packages'
);

const copy = {
  heading: 'Package index',
  placeholder: 'Filter packages…',
  inputLabel: 'Filter packages',
};

mount({
  query,
  packages,
  results,
  emptyLine,
  countLine,
  copy,
  setQuery: (v) => query.set(v),
});
`,
  css: `:root {
  --size-width-card: 460px;
  --spacing-margin-card: 24px auto;
  --spacing-padding-card: 20px 22px;
  --size-border-card: 1px;
  --keyword-border-card: solid;
  --color-border-card: #8885;
  --size-radius-card: 12px;
  --spacing-margin-card-title: 0 0 12px;
  --font-size-card-title: 19px;
  --spacing-margin-card-search: 0;
  --size-width-card-input: 100%;
  --spacing-padding-card-input: 8px 10px;
  --size-border-card-input: 1px;
  --keyword-border-card-input: solid;
  --color-border-card-input: #8886;
  --size-radius-card-input: 8px;
  --color-bkg-card-input: transparent;
  --color-text-card-input: inherit;
  --keyword-style-card-list: none;
  --spacing-margin-card-list: 12px 0;
  --spacing-padding-card-list: 0;
  --spacing-padding-card-item: 8px 0;
  --size-border-card-item: 1px;
  --keyword-border-card-item: solid;
  --color-border-card-item: #8883;
  --font-size-card-item: 14px;
  --font-leading-card-item: 1.45;
  --spacing-margin-card-item-desc: 0;
  --number-opacity-card-item-desc: 0.7;
  --font-size-card-item-desc: 13px;
  --number-opacity-card-empty: 0.65;
  --font-size-card-note: 13px;
  --number-opacity-card-note: 0.7;
  --spacing-margin-card-note: 0;
}

section[variant="card"] {
  max-width: var(--size-width-card);
  margin: var(--spacing-margin-card);
  padding: var(--spacing-padding-card);
  border: var(--size-border-card) var(--keyword-border-card) var(--color-border-card);
  border-radius: var(--size-radius-card);
}
section[variant="card"] > header h2 {
  margin: var(--spacing-margin-card-title);
  font-size: var(--font-size-card-title);
}
section[variant="card"] > header p {
  margin: var(--spacing-margin-card-search);
}
section[variant="card"] > header input {
  width: var(--size-width-card-input);
  padding: var(--spacing-padding-card-input);
  border: var(--size-border-card-input) var(--keyword-border-card-input) var(--color-border-card-input);
  border-radius: var(--size-radius-card-input);
  background: var(--color-bkg-card-input);
  color: var(--color-text-card-input);
}
section[variant="card"] > ul {
  list-style: var(--keyword-style-card-list);
  margin: var(--spacing-margin-card-list);
  padding: var(--spacing-padding-card-list);
}
section[variant="card"] > ul > li {
  padding: var(--spacing-padding-card-item);
  border-bottom: var(--size-border-card-item) var(--keyword-border-card-item) var(--color-border-card-item);
  font-size: var(--font-size-card-item);
  line-height: var(--font-leading-card-item);
}
section[variant="card"] > ul > li > p {
  margin: var(--spacing-margin-card-item-desc);
  opacity: var(--number-opacity-card-item-desc);
  font-size: var(--font-size-card-item-desc);
}
section[variant="card"] > ul > li:not(:has(> strong)) {
  opacity: var(--number-opacity-card-empty);
}
section[variant="card"] > footer p {
  font-size: var(--font-size-card-note);
  opacity: var(--number-opacity-card-note);
  margin-bottom: var(--spacing-margin-card-note);
}
`,
};

export const EXAMPLES = [COUNTER, TODOS, GREETING, TABS, FILTER];
