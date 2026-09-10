/**
 * Walk a list of tree nodes, computing the shared per-node state (id, whether
 * it has children, whether it is expanded) and rendering expanded children
 * before handing everything to `render`. Used by Tree and TreeGrid, which
 * differ only in the markup each node produces.
 *
 * @param {Array<object>} items
 * @param {{ getId: (node: object) => string, expanded: Set<string>, render: (state: {node: object, nodeId: string, hasChildren: boolean, isExpanded: boolean, level: number, children: string}) => string }} options
 * @param {number} [level]
 * @returns {string}
 */
export function renderNodes(items, options, level = 0) {
  const { getId, expanded, render } = options;
  return items
    .map(node => {
      const nodeId = getId(node);
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = hasChildren && expanded.has(nodeId);
      const children = isExpanded ? renderNodes(node.children, options, level + 1) : '';
      return render({ node, nodeId, hasChildren, isExpanded, level, children });
    })
    .join('');
}

/** aria-expanded only makes sense on a node that can expand; leaves omit it. */
export function ariaExpanded(hasChildren, isExpanded) {
  return hasChildren ? ` aria-expanded="${isExpanded}"` : '';
}
