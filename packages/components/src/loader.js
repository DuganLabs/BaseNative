// @ts-check
/* Server-side loader for Holy Trinity components.
   Plays the barrel role for the pilot: imports each component directory,
   reads its index.html / styles.css, and registers the whole component.
   The caller supplies render() from @basenative/server, so this package
   keeps its existing dependency direction (runtime + forms only) and
   templates stay parsed data (no eval), exactly as elsewhere in BaseNative. */

import { readFile } from 'node:fs/promises';
import { createRegistry } from './registry.js';

/** @typedef {import('./registry.js').Registry} Registry */

const COMPONENTS = [
  'button', 'input', 'field', 'dialog',
  'badge', 'checkbox', 'toggle', 'radio', 'textarea', 'select',
  'alert', 'progress', 'card', 'choice-group',
  'avatar', 'accordion', 'breadcrumb', 'pagination', 'list-group',
  'combobox', 'multiselect',
  'drawer', 'dropdown-menu', 'command-palette', 'tooltip', 'toast',
  'table', 'datagrid', 'tree', 'virtualizer', 'calendar', 'pipeline',
  'theme-toggle',
];

/** @param {string} html */
function unwrapTemplate(html) {
  return html.replace(/^\s*<template>/, '').replace(/<\/template>\s*$/, '');
}

export async function loadRegistry() {
  const registry = createRegistry();
  for (const name of COMPONENTS) {
    const dir = new URL(`./${name}/`, import.meta.url);
    const mod = await import(new URL('./index.js', dir));
    const template = unwrapTemplate(await readFile(new URL('./index.html', dir), 'utf8'));
    const styles = await readFile(new URL('./styles.css', dir), 'utf8');
    registry.registerComponent({ name: mod.name, root: mod.root, create: mod.create, template, styles });
    mod.registerVariants(registry);
  }
  return registry;
}

/**
 * @param {Registry} registry
 * @param {(template: string, context: object) => string} renderFn render() from @basenative/server.
 * @param {string} name
 * @param {object} props
 * @returns {{ html: string, viewModel: object }}
 */
export function renderComponent(registry, renderFn, name, props) {
  const def = registry.getComponent(name);
  const viewModel = def.create(props);
  return { html: renderFn(def.template, viewModel), viewModel };
}

/**
 * The CSS a page needs: the token sheet, then each used component's styles.
 * Variant rules ride inside each component's own styles.css (a generated
 * block at the end), so there is no separate variants sheet to assemble.
 * @param {Registry} registry
 * @param {string[]} usedNames
 */
export async function assembleStyles(registry, usedNames) {
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const parts = [tokens];
  for (const name of usedNames) {
    parts.push(registry.getComponent(name).styles);
  }
  return parts.join('\n\n');
}
