/**
 * createCanvas(options) - Creates a visual builder canvas
 *
 * State model (unchanged contract): a flat insertion-ordered Map of nodes.
 * Each node carries a `parentId` and a `children` id list; the tree shape
 * is derived from those two fields, never stored separately.
 *
 * History model: every mutation appends ONE entry to the undo stack
 * instead of a pair of undo/redo closures, and applyUndo/applyRedo below
 * interpret the entries. This keeps the observable undo/redo semantics
 * identical to the original closure-based implementation while making
 * bulk loads (importFromHTML / deserialize adding tens of thousands of
 * nodes) far cheaper per node: an 'add' entry is the node object itself
 * (the parallel `undoKinds` array says how to interpret each entry), so
 * the common case allocates no history record at all, and the rarer
 * operations carry one small data object each instead of two closures.
 *
 * Every traversal in this module is iterative. The original removeNode
 * walked descendants recursively and threw RangeError ("Maximum call
 * stack size exceeded") on trees deeper than roughly 10,000 levels; with
 * an explicit stack, depth is bounded by heap, not by the call stack.
 *
 * @param {object} options
 * @param {number} [options.width=1024]
 * @param {number} [options.height=768]
 * @param {number} [options.gridSize=8]
 * @returns {import('../types/index.d.ts').Canvas}
 */
export function createCanvas(options = {}) {
  const { width = 1024, height = 768, gridSize = 8 } = options;

  /** @type {Map<string, import('../types/index.d.ts').CanvasNode>} */
  const nodes = new Map();

  // History entries: undoStack holds the payload, undoKinds the operation
  // tag for the entry at the same index. Payload by kind:
  //   add    -> the added node itself (no extra allocation)
  //   remove -> { node: snapshot clone, descendants: [clones] }
  //   move   -> { node, from, to }   (position objects)
  //   resize -> { node, from, to }   (size objects)
  //   clear  -> { snapshot: Map<id, node clone> }
  const KIND_ADD = 0;
  const KIND_REMOVE = 1;
  const KIND_MOVE = 2;
  const KIND_RESIZE = 3;
  const KIND_CLEAR = 4;

  /** @type {Array<any>} undo stack of history payloads */
  const undoStack = [];

  /** @type {Array<number>} operation tags parallel to undoStack */
  const undoKinds = [];

  /** @type {Array<any>} redo stack of history payloads */
  const redoStack = [];

  /** @type {Array<number>} operation tags parallel to redoStack */
  const redoKinds = [];

  /** @type {Set<(event: string, data?: any) => void>} */
  const subscribers = new Set();

  let idCounter = 0;

  function generateId() {
    return `node_${++idCounter}`;
  }

  function notify(event, data) {
    // Guarded: iterating an empty Set still allocates an iterator, which
    // matters when a bulk load fires this once per node.
    if (subscribers.size === 0) return;
    for (const cb of subscribers) {
      cb(event, data);
    }
  }

  function pushRecord(kind, payload) {
    undoStack.push(payload);
    undoKinds.push(kind);
    redoStack.length = 0;
    redoKinds.length = 0;
  }

  /** Append `node.id` to its parent's children list, if the parent exists. */
  function linkToParent(node) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId);
      if (!parent.children.includes(node.id)) {
        parent.children.push(node.id);
      }
    }
  }

  /** Remove `id` from the children list of the node named `parentId`. */
  function unlinkFromParent(id, parentId) {
    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId);
      parent.children = parent.children.filter((c) => c !== id);
    }
  }

  function applyUndo(kind, payload) {
    switch (kind) {
      case KIND_ADD:
        nodes.delete(payload.id);
        unlinkFromParent(payload.id, payload.parentId);
        break;
      case KIND_REMOVE:
        nodes.set(payload.node.id, payload.node);
        linkToParent(payload.node);
        for (const child of payload.descendants) {
          nodes.set(child.id, child);
        }
        break;
      case KIND_MOVE:
        payload.node.position = payload.from;
        break;
      case KIND_RESIZE:
        payload.node.size = payload.from;
        break;
      case KIND_CLEAR:
        for (const [id, node] of payload.snapshot) {
          nodes.set(id, node);
        }
        break;
    }
  }

  function applyRedo(kind, payload) {
    switch (kind) {
      case KIND_ADD:
        nodes.set(payload.id, payload);
        linkToParent(payload);
        break;
      case KIND_REMOVE:
        nodes.delete(payload.node.id);
        unlinkFromParent(payload.node.id, payload.node.parentId);
        for (const child of payload.descendants) {
          nodes.delete(child.id);
        }
        break;
      case KIND_MOVE:
        payload.node.position = payload.to;
        break;
      case KIND_RESIZE:
        payload.node.size = payload.to;
        break;
      case KIND_CLEAR:
        nodes.clear();
        break;
    }
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

    // Inlined linkToParent + pushRecord + notify: addNode is the hottest
    // function in the package (a bulk import calls it once per element),
    // and on a cold process the extra call layers are a measurable slice
    // of its cost. The operations are identical to the helper versions.
    if (full.parentId && nodes.has(full.parentId)) {
      const parent = nodes.get(full.parentId);
      if (!parent.children.includes(id)) {
        parent.children.push(id);
      }
    }
    undoStack.push(full);
    undoKinds.push(KIND_ADD);
    redoStack.length = 0;
    redoKinds.length = 0;
    if (subscribers.size > 0) {
      for (const cb of subscribers) {
        cb('add', full);
      }
    }
    return full;
  }

  function removeNode(id) {
    const node = nodes.get(id);
    if (!node) return false;

    const snapshot = structuredClone(node);
    nodes.delete(id);
    unlinkFromParent(id, snapshot.parentId);

    // Collect descendants in pre-order (parent before its children, in
    // children-list order) with an explicit stack — the original recursive
    // walk overflowed the call stack on deep trees. Ids that no longer
    // resolve (dangling references) are skipped. The `seen` set keeps
    // duplicate child entries and outright cycles in the children lists
    // from re-walking a subtree forever: the recursive original deleted
    // each node as it went (so a second visit found nothing) but looped
    // until it overflowed on a true cycle; here each id is collected at
    // most once, which matches the original result on every input the
    // original survived.
    const descendantIds = [];
    const seen = new Set();
    const stack = [];
    for (let i = snapshot.children.length - 1; i >= 0; i--) {
      stack.push(snapshot.children[i]);
    }
    while (stack.length > 0) {
      const childId = stack.pop();
      if (seen.has(childId)) continue;
      const child = nodes.get(childId);
      if (!child) continue;
      seen.add(childId);
      descendantIds.push(childId);
      for (let i = child.children.length - 1; i >= 0; i--) {
        stack.push(child.children[i]);
      }
    }

    const descendants = [];
    for (const childId of descendantIds) {
      descendants.push(structuredClone(nodes.get(childId)));
      nodes.delete(childId);
    }

    pushRecord(KIND_REMOVE, { node: snapshot, descendants });
    notify('remove', { id });
    return true;
  }

  function moveNode(id, position) {
    const node = nodes.get(id);
    if (!node) return false;

    const from = { ...node.position };
    const to = { x: position.x, y: position.y };
    node.position = to;

    pushRecord(KIND_MOVE, { node, from, to });
    notify('move', { id, position });
    return true;
  }

  function resizeNode(id, size) {
    const node = nodes.get(id);
    if (!node) return false;

    const from = { ...node.size };
    const to = { width: size.width, height: size.height };
    node.size = to;

    pushRecord(KIND_RESIZE, { node, from, to });
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

    pushRecord(KIND_CLEAR, { snapshot });
    notify('clear', null);
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function undo() {
    if (undoStack.length === 0) return false;
    const payload = undoStack.pop();
    const kind = undoKinds.pop();
    applyUndo(kind, payload);
    redoStack.push(payload);
    redoKinds.push(kind);
    notify('undo', null);
    return true;
  }

  function redo() {
    if (redoStack.length === 0) return false;
    const payload = redoStack.pop();
    const kind = redoKinds.pop();
    applyRedo(kind, payload);
    undoStack.push(payload);
    undoKinds.push(kind);
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
