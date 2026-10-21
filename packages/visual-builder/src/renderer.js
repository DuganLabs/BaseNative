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
 *
 * The original implementation recursed once per tree level, so rendering
 * a deeply nested document (tens of thousands of levels — exactly what a
 * builder must survive when fed generated or hostile markup) died with a
 * stack-overflow RangeError. This is an explicit-stack post-order walk
 * that produces byte-identical output: children render before their
 * parent (so component functions observe the same call order), sibling
 * output is joined with '\n', and a parent's rendered children are passed
 * in as `props.children` only when the joined string is non-empty.
 *
 * A hand-built node graph that contains a true object cycle (a node that
 * is its own ancestor) cannot come out of a canvas — getTree only ever
 * returns forests — but if one is passed in directly, the walk throws a
 * RangeError, the same failure the recursive version produced, instead
 * of looping forever.
 *
 * @param {import('../types/index.d.ts').CanvasNode & { children: any[] }} node
 * @param {Record<string, (props: object) => string>} componentMap
 * @returns {string}
 */
export function renderNode(root, componentMap) {
  const ancestors = new Set();
  const stack = [];
  let result;

  // Each frame tracks one node's render: the component function, the
  // child values still to render (walked by index), and the rendered
  // strings collected so far. `result` carries the most recently
  // completed node's output up to its parent frame.
  function openFrame(node) {
    const renderFn = componentMap[node.type];
    if (!renderFn) {
      return { done: true, output: `<!-- unknown component: ${node.type} -->` };
    }
    if (ancestors.has(node)) {
      throw new RangeError('Maximum call stack size exceeded');
    }
    ancestors.add(node);
    return {
      done: false,
      node,
      renderFn,
      children: node.children && node.children.length > 0 ? node.children : null,
      index: 0,
      parts: [],
    };
  }

  let frame = openFrame(root);
  if (frame.done) return frame.output;
  stack.push(frame);

  while (stack.length > 0) {
    const top = stack[stack.length - 1];

    if (top.children && top.index < top.children.length) {
      const childFrame = openFrame(top.children[top.index++]);
      if (childFrame.done) {
        top.parts.push(childFrame.output);
      } else {
        stack.push(childFrame);
      }
      continue;
    }

    // All children rendered (or none to render): finish this node.
    stack.pop();
    ancestors.delete(top.node);
    const childrenHtml = top.children ? top.parts.join('\n') : '';
    const props = { ...top.node.props };
    if (childrenHtml) {
      props.children = childrenHtml;
    }
    result = top.renderFn(props);
    if (stack.length > 0) {
      stack[stack.length - 1].parts.push(result);
    }
  }

  return result;
}
