/**
 * Walk a list of tree nodes, computing the shared per-node state (id, whether
 * it has children, whether it is expanded) and rendering expanded children
 * before handing everything to `render`. Used by Tree and TreeGrid, which
 * differ only in the markup each node produces.
 *
 * `index` is the node's position among its siblings; combined with `level`,
 * callers use `level === 0 && index === 0` to find the single node that is
 * always first in document order — the very first top-level item, since a
 * node's own markup always precedes its (possibly expanded) children in the
 * emitted HTML regardless of nesting. That node is the one a roving-tabindex
 * pattern should start on (`tabindex="0"`), with every other node at `-1`.
 *
 * @param {Array<object>} items
 * @param {{ getId: (node: object) => string, expanded: Set<string>, render: (state: {node: object, nodeId: string, hasChildren: boolean, isExpanded: boolean, level: number, children: string, index: number}) => string }} options
 * @param {number} [level]
 * @returns {string}
 */
export function renderNodes(items, options, level = 0) {
  const { getId, expanded, render } = options;
  return items
    .map((node, index) => {
      const nodeId = getId(node);
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = hasChildren && expanded.has(nodeId);
      const children = isExpanded ? renderNodes(node.children, options, level + 1) : '';
      return render({ node, nodeId, hasChildren, isExpanded, level, children, index });
    })
    .join('');
}

/** `0` for the node that is first in document order (roving-tabindex entry point), `-1` otherwise. */
export function rovingTabIndex(level, index) {
  return level === 0 && index === 0 ? 0 : -1;
}

/** aria-expanded only makes sense on a node that can expand; leaves omit it. */
export function ariaExpanded(hasChildren, isExpanded) {
  return hasChildren ? ` aria-expanded="${isExpanded}"` : '';
}
