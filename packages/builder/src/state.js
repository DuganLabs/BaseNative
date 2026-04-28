import { signal, computed, batch } from '@basenative/runtime';

const ROOT_ID = 'root';

function emptyTree() {
  const nodes = new Map();
  nodes.set(ROOT_ID, {
    id: ROOT_ID,
    type: 'main',
    props: {},
    bindings: {},
    events: {},
    children: [],
    parentId: null,
  });
  return nodes;
}

function cloneNodes(nodes) {
  const out = new Map();
  for (const [id, node] of nodes) {
    out.set(id, {
      id: node.id,
      type: node.type,
      props: { ...node.props },
      bindings: { ...node.bindings },
      events: { ...node.events },
      children: [...node.children],
      parentId: node.parentId,
    });
  }
  return out;
}

function descendantsOf(nodes, id) {
  const out = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    const node = nodes.get(current);
    if (!node) continue;
    out.push(current);
    for (const child of node.children) stack.push(child);
  }
  return out;
}

export function createBuilderState() {
  const tree = signal(emptyTree());
  const selectedId = signal(null);
  const past = [];
  const future = [];
  let idCounter = 0;

  const generateId = () => `n${++idCounter}`;

  function commit(mutator) {
    const previous = cloneNodes(tree());
    const next = cloneNodes(previous);
    const result = mutator(next);
    if (result === false) return null;
    past.push(previous);
    future.length = 0;
    tree.set(next);
    return result ?? null;
  }

  function addNode({ type, parentId = ROOT_ID, props, bindings, events, index } = {}) {
    if (!type) throw new Error('addNode: type is required');
    return commit((nodes) => {
      const parent = nodes.get(parentId);
      if (!parent) return false;
      const id = generateId();
      const node = {
        id,
        type,
        props: { ...(props || {}) },
        bindings: { ...(bindings || {}) },
        events: { ...(events || {}) },
        children: [],
        parentId,
      };
      nodes.set(id, node);
      const at = typeof index === 'number' ? index : parent.children.length;
      const clamped = Math.max(0, Math.min(parent.children.length, at));
      parent.children.splice(clamped, 0, id);
      return id;
    });
  }

  function removeNode(id) {
    if (id === ROOT_ID) return false;
    const removedId = commit((nodes) => {
      const node = nodes.get(id);
      if (!node) return false;
      const parent = nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter((c) => c !== id);
      }
      for (const descendantId of descendantsOf(nodes, id)) {
        nodes.delete(descendantId);
      }
      return id;
    });
    if (removedId && selectedId.peek() === id) selectedId.set(null);
    return removedId !== null;
  }

  function moveNode(id, { parentId, index } = {}) {
    if (id === ROOT_ID) return false;
    const moved = commit((nodes) => {
      const node = nodes.get(id);
      const newParent = nodes.get(parentId ?? node?.parentId);
      if (!node || !newParent) return false;
      const oldParent = nodes.get(node.parentId);
      if (newParent.id !== ROOT_ID) {
        const ancestors = descendantsOf(nodes, id);
        if (ancestors.includes(newParent.id)) return false;
      }
      if (oldParent) {
        oldParent.children = oldParent.children.filter((c) => c !== id);
      }
      const at = typeof index === 'number' ? index : newParent.children.length;
      const clamped = Math.max(0, Math.min(newParent.children.length, at));
      newParent.children.splice(clamped, 0, id);
      node.parentId = newParent.id;
      return id;
    });
    return moved !== null;
  }

  function updateProps(id, patch) {
    return commit((nodes) => {
      const node = nodes.get(id);
      if (!node) return false;
      for (const [key, value] of Object.entries(patch || {})) {
        if (value === undefined) {
          delete node.props[key];
        } else {
          node.props[key] = value;
        }
      }
      return id;
    }) !== null;
  }

  function updateBindings(id, patch) {
    return commit((nodes) => {
      const node = nodes.get(id);
      if (!node) return false;
      for (const [key, value] of Object.entries(patch || {})) {
        if (value === undefined || value === '') {
          delete node.bindings[key];
        } else {
          node.bindings[key] = value;
        }
      }
      return id;
    }) !== null;
  }

  function updateEvents(id, patch) {
    return commit((nodes) => {
      const node = nodes.get(id);
      if (!node) return false;
      for (const [key, value] of Object.entries(patch || {})) {
        if (value === undefined || value === '') {
          delete node.events[key];
        } else {
          node.events[key] = value;
        }
      }
      return id;
    }) !== null;
  }

  function getNode(id) {
    return tree().get(id) || null;
  }

  function getRoot() {
    return tree().get(ROOT_ID);
  }

  function toJSON() {
    const nodes = tree();
    return JSON.stringify(
      {
        root: ROOT_ID,
        nodes: Array.from(nodes.values()),
      },
      null,
      2,
    );
  }

  function fromJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    if (!parsed || !Array.isArray(parsed.nodes)) {
      throw new Error('fromJSON: invalid payload, expected { nodes: [] }');
    }
    const next = new Map();
    let maxNumeric = 0;
    for (const node of parsed.nodes) {
      next.set(node.id, {
        id: node.id,
        type: node.type,
        props: { ...(node.props || {}) },
        bindings: { ...(node.bindings || {}) },
        events: { ...(node.events || {}) },
        children: Array.isArray(node.children) ? [...node.children] : [],
        parentId: node.parentId ?? null,
      });
      const match = /^n(\d+)$/.exec(node.id);
      if (match) maxNumeric = Math.max(maxNumeric, Number(match[1]));
    }
    if (!next.has(ROOT_ID)) {
      throw new Error('fromJSON: payload missing root node');
    }
    batch(() => {
      past.push(cloneNodes(tree()));
      future.length = 0;
      tree.set(next);
      selectedId.set(null);
    });
    idCounter = Math.max(idCounter, maxNumeric);
  }

  function undo() {
    const previous = past.pop();
    if (!previous) return false;
    future.push(cloneNodes(tree()));
    tree.set(previous);
    if (selectedId.peek() && !previous.has(selectedId.peek())) {
      selectedId.set(null);
    }
    return true;
  }

  function redo() {
    const next = future.pop();
    if (!next) return false;
    past.push(cloneNodes(tree()));
    tree.set(next);
    if (selectedId.peek() && !next.has(selectedId.peek())) {
      selectedId.set(null);
    }
    return true;
  }

  function canUndo() {
    return past.length > 0;
  }

  function canRedo() {
    return future.length > 0;
  }

  function select(id) {
    if (id === null) {
      selectedId.set(null);
      return true;
    }
    if (!tree().has(id)) return false;
    selectedId.set(id);
    return true;
  }

  const selectedNode = computed(() => {
    const id = selectedId();
    if (!id) return null;
    return tree().get(id) || null;
  });

  return {
    ROOT_ID,
    tree,
    selectedId,
    selectedNode,
    addNode,
    removeNode,
    moveNode,
    updateProps,
    updateBindings,
    updateEvents,
    getNode,
    getRoot,
    select,
    undo,
    redo,
    canUndo,
    canRedo,
    toJSON,
    fromJSON,
  };
}

export { ROOT_ID };
