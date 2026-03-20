/**
 * renderCanvas(canvas, componentMap) - Renders canvas nodes to HTML
 * @param {import('./canvas.js').Canvas} canvas
 * @param {Record<string, (props: object) => string>} componentMap
 * @returns {string}
 */
export function renderCanvas(canvas, componentMap) {
  const tree = canvas.getTree();
  return tree.map((node) => renderNode(node, componentMap)).join('\n');
}

/**
 * renderNode(node, componentMap) - Render a single node and its children
 * @param {import('../types/index.d.ts').CanvasNode & { children: any[] }} node
 * @param {Record<string, (props: object) => string>} componentMap
 * @returns {string}
 */
export function renderNode(node, componentMap) {
  const renderFn = componentMap[node.type];
  if (!renderFn) {
    return `<!-- unknown component: ${node.type} -->`;
  }

  const childrenHtml =
    node.children && node.children.length > 0
      ? node.children.map((child) => renderNode(child, componentMap)).join('\n')
      : '';

  const props = { ...node.props };
  if (childrenHtml) {
    props.children = childrenHtml;
  }

  return renderFn(props);
}
