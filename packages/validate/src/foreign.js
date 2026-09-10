/**
 * Foreign-syntax detection — the anti-drift mechanism.
 *
 * BaseNative's syntax is a hybrid of four ecosystems: `{{ }}` (Vue/Angular),
 * `@for="item of items; track item.id"` (Angular 17, near-verbatim), `:disabled`
 * (Vue), `signal()/computed()/effect()` (Solid/Angular). That familiarity makes it
 * trivially readable, and it makes the failure mode *confident regression to the
 * nearest neighbour* — a model under load emits `v-if`, or Angular's block syntax,
 * or `$state`, rather than inventing something novel.
 *
 * Each rule therefore names the source framework and gives the exact BaseNative
 * replacement, so the diagnostic is repairable without documentation.
 */

/**
 * Attribute-level foreign directives.
 * `rewrite(value, name)` returns the corrected BaseNative markup for the suggestion.
 */
export const FOREIGN_ATTRIBUTES = [
  // ---- Vue ----
  {
    match: /^v-if$/,
    framework: 'Vue',
    rewrite: (v) => `<template @if="${v}">`,
    note: 'BaseNative puts conditionals on a <template>, not on the element itself',
  },
  {
    match: /^v-else-if$/,
    framework: 'Vue',
    rewrite: (v) => `<template @elseif="${v}">`,
  },
  { match: /^v-else$/, framework: 'Vue', rewrite: () => '<template @else>' },
  {
    match: /^v-for$/,
    framework: 'Vue',
    // Vue writes `item in items`; BaseNative requires `of` and a track expression.
    rewrite: (v) => {
      const m = /^\s*(.+?)\s+(?:in|of)\s+(.+?)\s*$/.exec(v);
      if (!m) return '<template @for="item of items; track item.id">';
      const [, item, list] = m;
      return `<template @for="${item} of ${list}; track ${item}.id">`;
    },
  },
  { match: /^v-show$/, framework: 'Vue', rewrite: (v) => `<template @if="${v}">` },
  { match: /^v-html$/, framework: 'Vue', rewrite: () => '{{ value }}', note: 'BaseNative has no raw-HTML directive; interpolate text instead' },
  { match: /^v-text$/, framework: 'Vue', rewrite: (v) => `{{ ${v} }}` },
  { match: /^v-model$/, framework: 'Vue', rewrite: (v) => `:value="${v}" @input="${v}.set($event.target.value)"` },
  { match: /^v-bind:(.+)$/, framework: 'Vue', rewrite: (v, n) => `:${n.slice('v-bind:'.length)}="${v}"` },
  { match: /^v-on:(.+)$/, framework: 'Vue', rewrite: (v, n) => `@${n.slice('v-on:'.length)}="${v}"` },

  // ---- Angular ----
  {
    match: /^\*ngIf$/,
    framework: 'Angular',
    rewrite: (v) => `<template @if="${v}">`,
  },
  {
    match: /^\*ngFor$/,
    framework: 'Angular',
    rewrite: (v) => {
      const m = /let\s+(\w+)\s+of\s+(.+?)(?:;|$)/.exec(v);
      if (!m) return '<template @for="item of items; track item.id">';
      const [, item, list] = m;
      return `<template @for="${item} of ${list.trim()}; track ${item}.id">`;
    },
  },
  { match: /^\*ngSwitchCase$/, framework: 'Angular', rewrite: (v) => `<template @case="${v}">` },
  { match: /^\[(.+)\]$/, framework: 'Angular', rewrite: (v, n) => `:${n.slice(1, -1)}="${v}"` },
  { match: /^\((.+)\)$/, framework: 'Angular', rewrite: (v, n) => `@${n.slice(1, -1)}="${v}"` },

  // ---- Svelte / Alpine ----
  { match: /^x-if$/, framework: 'Alpine', rewrite: (v) => `<template @if="${v}">` },
  { match: /^x-for$/, framework: 'Alpine', rewrite: (v) => `<template @for="${v}; track item.id">` },
  { match: /^x-show$/, framework: 'Alpine', rewrite: (v) => `<template @if="${v}">` },
  { match: /^x-text$/, framework: 'Alpine', rewrite: (v) => `{{ ${v} }}` },
  { match: /^x-bind:(.+)$/, framework: 'Alpine', rewrite: (v, n) => `:${n.slice('x-bind:'.length)}="${v}"` },
  { match: /^x-on:(.+)$/, framework: 'Alpine', rewrite: (v, n) => `@${n.slice('x-on:'.length)}="${v}"` },
  { match: /^on:(.+)$/, framework: 'Svelte', rewrite: (v, n) => `@${n.slice('on:'.length)}="${v}"` },
  { match: /^bind:(.+)$/, framework: 'Svelte', rewrite: (v, n) => `:${n.slice('bind:'.length)}="${v}"` },
];

/**
 * Block-level foreign syntax that appears in text rather than as an attribute.
 * Angular 17 control-flow blocks are the highest-risk case: `@if` is a real
 * BaseNative directive name, so a model that knows Angular 17 will very plausibly
 * reach for `@if (cond) { ... }` block form, which BaseNative does not parse at all.
 */
export const FOREIGN_BLOCKS = [
  {
    // `@if (cond) {`  /  `@for (x of xs; track x.id) {`  /  `@switch (v) {`
    match: /@(if|else if|for|switch|empty|defer)\s*\([^)]*\)\s*\{/g,
    framework: 'Angular 17 block syntax',
    suggestion:
      'BaseNative uses attribute directives on <template>, not Angular block syntax: <template @if="cond"> … </template>',
  },
  {
    match: /\{#(if|each|await)\b[^}]*\}/g,
    framework: 'Svelte',
    suggestion:
      'BaseNative uses attribute directives on <template>: <template @if="cond"> … </template> or <template @for="item of items; track item.id">',
  },
];

/** Foreign reactivity primitives in script content. */
export const FOREIGN_REACTIVITY = [
  { match: /\$state\s*\(/g, framework: 'Svelte 5 runes', suggestion: 'use signal(...) from @basenative/runtime' },
  { match: /\$derived\s*\(/g, framework: 'Svelte 5 runes', suggestion: 'use computed(...) from @basenative/runtime' },
  { match: /\$effect\s*\(/g, framework: 'Svelte 5 runes', suggestion: 'use effect(...) from @basenative/runtime' },
  { match: /\bref\s*\(/g, framework: 'Vue', suggestion: 'use signal(...) from @basenative/runtime' },
  { match: /\buseState\s*\(/g, framework: 'React', suggestion: 'use signal(...) from @basenative/runtime' },
  { match: /\buseEffect\s*\(/g, framework: 'React', suggestion: 'use effect(...) from @basenative/runtime' },
  { match: /\buseMemo\s*\(/g, framework: 'React', suggestion: 'use computed(...) from @basenative/runtime' },
];

/** Find the matching attribute rule for an attribute name, or null. */
export function foreignAttribute(name) {
  return FOREIGN_ATTRIBUTES.find((r) => r.match.test(name)) ?? null;
}
