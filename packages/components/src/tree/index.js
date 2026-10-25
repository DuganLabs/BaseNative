// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'tree';
export const root = 'ul';

/**
 * The recursive list. A branch item carries its children as rendered
 * HTML — the caller renders the SAME component for the child list and
 * nests it, so recursion is composition, not a template trick. The
 * branch's toggle is a caller-rendered button; aria-expanded lives on
 * the treeitem. The registered variant names the pattern: "tree" for
 * the navigation tree, "treegrid" when the rows carry grid cells.
 *
 * @typedef {object} TreeItem
 * @property {string} label
 * @property {boolean} [expanded]
 * @property {string} [toggleHtml] The rendered expand/collapse button. It
 *   carries the branch's name — when present it replaces the label text,
 *   so the branch reads as one control, not a button plus a duplicate label.
 * @property {string} [childrenHtml] A rendered child tree (branch items only).
 *
 * @typedef {object} TreeProps
 * @property {TreeItem[]} items
 * @property {string} [variant] A registered variant name.
 */

/** @param {TreeProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('tree: items is required');

  const items = signal(props.items);
  const variant = signal(props.variant ?? 'tree');
  const role = computed(() => variant());
  const expandedState = (/** @type {TreeItem} */ item) => (item.expanded ? 'true' : 'false');

  return { items, variant, role, expandedState, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('tree', 'tree');
  registry.registerVariant('tree', 'treegrid');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const tree = { name, root, create, registerVariants, template, styles };
export default tree;
