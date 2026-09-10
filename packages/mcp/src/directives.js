/**
 * The BaseNative directive reference, in one place.
 *
 * This is the source for the `list_directives` MCP tool. It is deliberately data,
 * not prose: an agent queries it, and the eval harness and docs generator can read
 * the same structure rather than re-describing the language a third time.
 */

export const DIRECTIVES = [
  {
    name: '@if',
    on: 'template',
    signature: '<template @if="expression">',
    summary: 'Render the contents when the expression is truthy.',
    example: '<template @if="user"><p>{{ user.name }}</p></template>',
    notes: 'Must be on a <template>. On any other element @if becomes an event listener and silently never renders conditionally.',
  },
  {
    name: '@else',
    on: 'template',
    signature: '<template @else>',
    summary: 'Fallback for the immediately preceding @if.',
    example: '<template @if="user">hi</template><template @else>anon</template>',
    notes: 'Must be the next sibling of the governing <template @if>. Takes no value.',
  },
  {
    name: '@for',
    on: 'template',
    signature: '<template @for="item of items; track item.id">',
    summary: 'Iterate a list, binding each entry to the item name.',
    example: '<template @for="item of items; track item.id"><li>{{ item.name }}</li></template>',
    notes: 'Uses `of`, never `in`. The `track` clause is optional but strongly recommended — without it reconciliation falls back to index order.',
  },
  {
    name: '@empty',
    on: 'template',
    signature: '<template @empty>',
    summary: 'Rendered when the preceding @for iterates nothing.',
    example: '<template @for="i of items; track i.id">…</template><template @empty>No results</template>',
    notes: 'Must be the next sibling of the governing <template @for>.',
  },
  {
    name: '@switch',
    on: 'template',
    signature: '<template @switch="expression">',
    summary: 'Select one branch by value.',
    example: '<template @switch="status"><template @case="1">One</template><template @default>Other</template></template>',
    notes: '@case and @default must be descendants of the @switch.',
  },
  {
    name: '@case',
    on: 'template',
    signature: '<template @case="value">',
    summary: 'A branch of the enclosing @switch, matched with ===.',
    example: '<template @case="\'active\'">Active</template>',
    notes: 'Requires an enclosing <template @switch>.',
  },
  {
    name: '@default',
    on: 'template',
    signature: '<template @default>',
    summary: 'Fallback branch of the enclosing @switch.',
    example: '<template @default>Unknown</template>',
    notes: 'Requires an enclosing <template @switch>. Takes no value.',
  },
  {
    name: '@defer',
    on: 'template',
    signature: '<template @defer>',
    summary: 'Stream this subtree separately, for Suspense-like partial rendering.',
    example: '<template @defer><expensive-widget /></template>',
    notes: 'Server-side streaming; hydration re-evaluates the subtree on arrival.',
  },
  {
    name: '@catch',
    on: 'template',
    signature: '<template @catch="handler">',
    summary: 'Error boundary for child template rendering.',
    example: '<template @catch="onError"><risky-thing /></template>',
    notes: 'Catches rendering errors raised by descendants.',
  },
  {
    name: '@feature',
    on: 'template',
    signature: '<template @feature="flagName">',
    summary: 'Render the contents only when the named feature flag is enabled for the current context.',
    example: '<template @feature="newDashboard"><p>New dashboard</p></template><template @else><p>Classic dashboard</p></template>',
    notes: 'Contributed by @basenative/flags through @basenative/runtime\'s directive registry (registerDirective), not built into the runtime/server core. Reads ctx.$flags.isEnabled(flagName) — build $flags with createFlagContext() before render()/hydrate(). With no $flags on context it is treated as disabled (renders @else if present, otherwise nothing) and emits a BN_FEATURE_NO_PROVIDER diagnostic. flagName is a literal flag name, not an expression.',
  },
  {
    name: '@t',
    on: 'element',
    signature: '<span @t="message.key">fallback text</span>',
    summary: "Replace the element's text content with the translated message for the given key.",
    example: '<h1 @t="nav.home">Home</h1>',
    notes: "Contributed by @basenative/i18n through @basenative/runtime's directive registry (registerDirective), not built into the runtime/server core. Reads ctx.$i18n and calls i18n.t(key, ctx), so any {param} placeholder in the message (i18n's own syntax) resolves from a same-named property on the render context. With no $i18n on context the element's existing content is left untouched and a BN_T_NO_PROVIDER diagnostic is emitted. Re-renders on the client when the i18n instance's locale changes. message.key is a literal key, not an expression.",
  },
  {
    name: '@<event>',
    on: 'element',
    signature: '<button @click="expression">',
    summary: 'Bind a DOM event listener. Any event name is accepted.',
    example: '<button @click="save($event)">Save</button>',
    notes: '$event and $el are available inside the handler expression. On a <template>, @name is control flow instead — the two namespaces overlap deliberately.',
  },
  {
    name: ':<attr>',
    on: 'element',
    signature: '<input :disabled="expression">',
    summary: 'Reactive attribute binding. Removed from the DOM when the value is false or null.',
    example: '<input :disabled="busy" :value="name">',
    notes: 'Re-evaluates whenever a signal it reads changes.',
  },
  {
    name: '{{ }}',
    on: 'text or attribute value',
    signature: '{{ expression }}',
    summary: 'Interpolate a value into text or an attribute.',
    example: '<p title="Hi {{ user.name }}">{{ user.name }}</p>',
    notes: 'null and undefined render as the empty string.',
  },
];

/** Reactivity primitives, exported from @basenative/runtime. */
export const PRIMITIVES = [
  { name: 'signal', signature: 'signal(initial)', summary: 'Writable reactive value. Read with sig(), write with sig.set(v).' },
  { name: 'computed', signature: 'computed(fn)', summary: 'Derived read-only value; recomputes when its dependencies change.' },
  { name: 'effect', signature: 'effect(fn)', summary: 'Run a side effect whenever its dependencies change.' },
  { name: 'batch', signature: 'batch(fn)', summary: 'Group signal writes so dependents run once.' },
];

/** Syntax from other frameworks that BaseNative does NOT accept. */
export const FORBIDDEN = [
  { foreign: 'v-if / v-else / v-for / v-show', framework: 'Vue', use: '<template @if> / <template @else> / <template @for="x of xs; track x.id">' },
  { foreign: 'v-bind:x / :x is fine, v-on:x', framework: 'Vue', use: ':x for attributes, @x for events' },
  { foreign: '*ngIf / *ngFor / [prop] / (event)', framework: 'Angular', use: '<template @if> / <template @for> / :prop / @event' },
  { foreign: '@if (cond) { }', framework: 'Angular 17 blocks', use: '<template @if="cond"> … </template> — attribute form, not block form' },
  { foreign: '{#if} / {#each} / on: / bind:', framework: 'Svelte', use: '<template @if> / <template @for> / @event / :attr' },
  { foreign: '$state / $derived / $effect', framework: 'Svelte 5 runes', use: 'signal() / computed() / effect()' },
  { foreign: 'useState / useEffect / useMemo', framework: 'React', use: 'signal() / effect() / computed()' },
  { foreign: 'x-show / x-for / x-text', framework: 'Alpine', use: '<template @if> / <template @for> / {{ }}' },
];
