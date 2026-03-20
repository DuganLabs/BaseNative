import { createCanvas } from './canvas.js';
import { renderCanvas } from './renderer.js';

/**
 * serialize(canvas) - Serialize canvas state to JSON string
 * @param {import('./canvas.js').Canvas} canvas
 * @returns {string}
 */
export function serialize(canvas) {
  const state = {
    version: '0.2.0',
    width: canvas.width,
    height: canvas.height,
    gridSize: canvas.gridSize,
    nodes: canvas.getNodes(),
  };
  return JSON.stringify(state, null, 2);
}

/**
 * deserialize(json) - Load JSON state into a new canvas
 * @param {string} json
 * @returns {import('./canvas.js').Canvas}
 */
export function deserialize(json) {
  const state = JSON.parse(json);
  const canvas = createCanvas({
    width: state.width,
    height: state.height,
    gridSize: state.gridSize,
  });

  // Sort nodes so parents are added before children
  const sorted = topologicalSort(state.nodes);
  for (const node of sorted) {
    canvas.addNode({
      id: node.id,
      type: node.type,
      props: node.props,
      children: node.children || [],
      position: node.position,
      size: node.size,
      parentId: node.parentId,
    });
  }

  return canvas;
}

/**
 * Topological sort: parents before children
 * @param {Array} nodes
 * @returns {Array}
 */
function topologicalSort(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set();
  const result = [];

  function visit(node) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    if (node.parentId && byId.has(node.parentId)) {
      visit(byId.get(node.parentId));
    }
    result.push(node);
  }

  for (const node of nodes) {
    visit(node);
  }
  return result;
}

/**
 * exportToHTML(canvas, componentMap) - Export canvas as standalone HTML file
 * @param {import('./canvas.js').Canvas} canvas
 * @param {Record<string, (props: object) => string>} componentMap
 * @returns {string}
 */
export function exportToHTML(canvas, componentMap) {
  const body = renderCanvas(canvas, componentMap);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BaseNative Page</title>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * importFromHTML(html) - Parse HTML back into canvas nodes (basic)
 * Extracts top-level elements from the <body> as individual nodes.
 * @param {string} html
 * @returns {import('./canvas.js').Canvas}
 */
export function importFromHTML(html) {
  const canvas = createCanvas();

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return canvas;

  const body = bodyMatch[1].trim();
  if (!body) return canvas;

  // Extract top-level HTML elements (basic parser)
  const tagRegex = /<(\w+)([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let match;
  let y = 0;

  while ((match = tagRegex.exec(body)) !== null) {
    const tagName = match[1];
    const attrs = match[2] || '';
    const content = match[3] || '';

    const props = {};

    // Parse attributes
    const attrRegex = /(\w[\w-]*)=["']([^"']*?)["']/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      props[attrMatch[1]] = attrMatch[2];
    }

    if (content.trim()) {
      props.content = content.trim();
    }

    canvas.addNode({
      type: tagName,
      props,
      position: { x: 0, y },
      size: { width: 200, height: 40 },
    });

    y += 50;
  }

  return canvas;
}
