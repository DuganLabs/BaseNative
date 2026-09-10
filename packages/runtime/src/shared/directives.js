/**
 * Registry for template directives contributed by packages other than
 * @basenative/runtime and @basenative/server — for example `@feature` from
 * @basenative/flags and `@t` from @basenative/i18n.
 *
 * @basenative/runtime and @basenative/server consult this registry by directive
 * name only; neither package imports flags/i18n (or any other directive-providing
 * package) directly, so the core stays free of that dependency. A directive-providing
 * package registers here as a side effect of being imported — usually from its own
 * `index.js` — before render() or hydrate() runs against a template that uses it.
 *
 * Two kinds of directive are supported, matching the two places a `@name` attribute
 * can appear in a BaseNative template:
 *
 * - `on: 'template'` — a control-flow directive on a `<template>` element, dispatched
 *   like the built-in `@if`: the handler returns a boolean. `true` renders the
 *   template's own content; `false` renders a following `<template @else>` sibling if
 *   present, otherwise nothing.
 * - `on: 'element'` (the default) — a content directive on any other element,
 *   dispatched like the `{{ }}` interpolator: the handler returns the string (or a
 *   `raw()`-wrapped HTML string) to use as the element's text content. Returning
 *   `undefined` leaves the element's existing content untouched, which lets a
 *   directive fall back to whatever static markup the template author already wrote.
 *
 * `server` and `client` are both optional handlers, `(value, ctx, options) => result`,
 * called with the attribute's raw string value, the current render/hydrate context,
 * and the render/hydrate options. Supply whichever side(s) the directive supports —
 * a directive that only registers a `client` handler simply never fires during
 * server render.
 */

const registry = new Map();

/**
 * Register a directive under `@<name>`.
 * @param {string} name - Directive name, without the leading `@`.
 * @param {{ on?: 'template'|'element', server?: Function, client?: Function }} config
 */
export function registerDirective(name, config = {}) {
  if (typeof name !== 'string' || name === '') {
    throw new Error('registerDirective: name must be a non-empty string.');
  }
  if (registry.has(name)) {
    throw new Error(`Directive "@${name}" is already registered.`);
  }
  if (typeof config.server !== 'function' && typeof config.client !== 'function') {
    throw new Error(`Directive "@${name}" needs a "server" and/or "client" handler function.`);
  }

  registry.set(name, {
    on: config.on === 'template' ? 'template' : 'element',
    server: typeof config.server === 'function' ? config.server : undefined,
    client: typeof config.client === 'function' ? config.client : undefined,
  });
}

/**
 * Remove a directive registration. Mainly useful for tests that register a
 * directive under a scoped name and want to clean up afterwards.
 * @param {string} name
 */
export function unregisterDirective(name) {
  registry.delete(name);
}

/**
 * @param {string} name
 * @returns {{ on: 'template'|'element', server?: Function, client?: Function }|undefined}
 */
export function getDirective(name) {
  return registry.get(name);
}

/**
 * @returns {string[]} Names of every currently registered directive.
 */
export function listDirectives() {
  return [...registry.keys()];
}
