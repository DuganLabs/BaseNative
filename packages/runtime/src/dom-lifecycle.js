const CLEANUPS = Symbol('basenative.cleanups');

export function registerCleanup(node, cleanup) {
  if (!node || typeof cleanup !== 'function') return cleanup;
  if (!node[CLEANUPS]) node[CLEANUPS] = [];
  node[CLEANUPS].push(cleanup);
  return cleanup;
}

export function disposeNodeTree(node) {
  if (!node) return;

  if (node.childNodes?.length) {
    for (const child of [...node.childNodes]) {
      disposeNodeTree(child);
    }
  }

  const cleanups = node[CLEANUPS];
  if (!cleanups?.length) return;

  while (cleanups.length) {
    const cleanup = cleanups.pop();
    cleanup();
  }
}

export function removeNodeTree(node) {
  if (!node) return;
  disposeNodeTree(node);
  node.remove();
}

export function removeNodeRange(start, end) {
  let node = start;
  while (node) {
    const current = node;
    node = node.nextSibling;
    removeNodeTree(current);
    if (current === end) break;
  }
}
