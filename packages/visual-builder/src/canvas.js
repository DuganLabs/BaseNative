/**
 * createCanvas(options) - Creates a visual builder canvas
 * @param {object} options
 * @param {number} [options.width=1024]
 * @param {number} [options.height=768]
 * @param {number} [options.gridSize=8]
 * @returns {Canvas}
 */
export function createCanvas(options = {}) {
  const { width = 1024, height = 768, gridSize = 8 } = options;

  /** @type {Map<string, import('../types/index.d.ts').CanvasNode>} */
  const nodes = new Map();

  /** @type {Array<{ undo: () => void, redo: () => void }>} */
  const undoStack = [];

  /** @type {Array<{ undo: () => void, redo: () => void }>} */
  const redoStack = [];

  /** @type {Set<(event: string, data?: any) => void>} */
  const subscribers = new Set();

  let idCounter = 0;

  function generateId() {
    return `node_${++idCounter}`;
  }

  function notify(event, data) {
    for (const cb of subscribers) {
      cb(event, data);
    }
  }

  function pushCommand(cmd) {
    undoStack.push(cmd);
    redoStack.length = 0;
  }

  function addNode(node) {
    const id = node.id || generateId();
    const full = {
      id,
      type: node.type || 'unknown',
      props: node.props || {},
      children: node.children || [],
      position: node.position || { x: 0, y: 0 },
      size: node.size || { width: 100, height: 40 },
      parentId: node.parentId || null,
    };

    nodes.set(id, full);

    // If this node has a parentId, add it to the parent's children list
    if (full.parentId && nodes.has(full.parentId)) {
      const parent = nodes.get(full.parentId);
      if (!parent.children.includes(id)) {
        parent.children.push(id);
      }
    }

    pushCommand({
      undo() {
        nodes.delete(id);
        if (full.parentId && nodes.has(full.parentId)) {
          const parent = nodes.get(full.parentId);
          parent.children = parent.children.filter((c) => c !== id);
        }
      },
      redo() {
        nodes.set(id, full);
        if (full.parentId && nodes.has(full.parentId)) {
          const parent = nodes.get(full.parentId);
          if (!parent.children.includes(id)) {
            parent.children.push(id);
          }
        }
      },
    });

    notify('add', full);
    return full;
  }

  function removeNode(id) {
    const node = nodes.get(id);
    if (!node) return false;

    const snapshot = structuredClone(node);
    nodes.delete(id);

    // Remove from parent's children
    if (snapshot.parentId && nodes.has(snapshot.parentId)) {
      const parent = nodes.get(snapshot.parentId);
      parent.children = parent.children.filter((c) => c !== id);
    }

    // Recursively remove children
    const removedChildren = [];
    function removeDescendants(childIds) {
      for (const childId of childIds) {
        const child = nodes.get(childId);
        if (child) {
          removedChildren.push(structuredClone(child));
          if (child.children.length) {
            removeDescendants(child.children);
          }
          nodes.delete(childId);
        }
      }
    }
    removeDescendants(snapshot.children);

    pushCommand({
      undo() {
        nodes.set(id, snapshot);
        if (snapshot.parentId && nodes.has(snapshot.parentId)) {
          const parent = nodes.get(snapshot.parentId);
          if (!parent.children.includes(id)) {
            parent.children.push(id);
          }
        }
        for (const child of removedChildren) {
          nodes.set(child.id, child);
        }
      },
      redo() {
        nodes.delete(id);
        if (snapshot.parentId && nodes.has(snapshot.parentId)) {
          const parent = nodes.get(snapshot.parentId);
          parent.children = parent.children.filter((c) => c !== id);
        }
        for (const child of removedChildren) {
          nodes.delete(child.id);
        }
      },
    });

    notify('remove', { id });
    return true;
  }

  function moveNode(id, position) {
    const node = nodes.get(id);
    if (!node) return false;

    const oldPosition = { ...node.position };
    node.position = { x: position.x, y: position.y };

    pushCommand({
      undo() {
        node.position = oldPosition;
      },
      redo() {
        node.position = { x: position.x, y: position.y };
      },
    });

    notify('move', { id, position });
    return true;
  }

  function resizeNode(id, size) {
    const node = nodes.get(id);
    if (!node) return false;

    const oldSize = { ...node.size };
    node.size = { width: size.width, height: size.height };

    pushCommand({
      undo() {
        node.size = oldSize;
      },
      redo() {
        node.size = { width: size.width, height: size.height };
      },
    });

    notify('resize', { id, size });
    return true;
  }

  function getNode(id) {
    return nodes.get(id) || null;
  }

  function getNodes() {
    return Array.from(nodes.values());
  }

  function getTree() {
    const roots = [];
    const nodeMap = new Map();

    // Clone nodes for tree output
    for (const node of nodes.values()) {
      nodeMap.set(node.id, { ...node, children: [] });
    }

    for (const node of nodes.values()) {
      const treeNode = nodeMap.get(node.id);
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    }

    return roots;
  }

  function clear() {
    const snapshot = new Map();
    for (const [id, node] of nodes) {
      snapshot.set(id, structuredClone(node));
    }

    nodes.clear();

    pushCommand({
      undo() {
        for (const [id, node] of snapshot) {
          nodes.set(id, node);
        }
      },
      redo() {
        nodes.clear();
      },
    });

    notify('clear', null);
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function undo() {
    const cmd = undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    redoStack.push(cmd);
    notify('undo', null);
    return true;
  }

  function redo() {
    const cmd = redoStack.pop();
    if (!cmd) return false;
    cmd.redo();
    undoStack.push(cmd);
    notify('redo', null);
    return true;
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  return {
    width,
    height,
    gridSize,
    addNode,
    removeNode,
    moveNode,
    resizeNode,
    getNode,
    getNodes,
    getTree,
    clear,
    subscribe,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
