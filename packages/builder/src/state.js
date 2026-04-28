import { signal, computed, batch } from '@basenative/runtime';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `n${idCounter.toString(36)}${Date.now().toString(36).slice(-4)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeNode(spec) {
  if (!spec || !spec.type) {
    throw new Error('Builder node requires a "type" field');
  }
  return {
    id: spec.id || nextId(),
    type: spec.type,
    props: spec.props ? { ...spec.props } : {},
    bindings: spec.bindings ? { ...spec.bindings } : {},
    children: Array.isArray(spec.children) ? spec.children.map(normalizeNode) : [],
  };
}

function normalizeRoots(initial) {
  if (!initial) return [];
  if (Array.isArray(initial)) return initial.map(normalizeNode);
  return [normalizeNode(initial)];
}

function findNode(roots, id) {
  for (const root of roots) {
    if (root.id === id)
      return { node: root, parent: null, siblings: roots, index: roots.indexOf(root) };
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.id === id) {
          return { node: child, parent: node, siblings: node.children, index: i };
        }
        stack.push(child);
      }
    }
  }
  return null;
}

function findPath(roots, id, path = []) {
  for (const root of roots) {
    if (root.id === id) return [...path, root.id];
    const sub = findPath(root.children, id, [...path, root.id]);
    if (sub) return sub;
  }
  return null;
}

function isAncestor(roots, ancestorId, descendantId) {
  const found = findNode(roots, ancestorId);
  if (!found) return false;
  const stack = [...found.node.children];
  while (stack.length) {
    const node = stack.pop();
    if (node.id === descendantId) return true;
    stack.push(...node.children);
  }
  return false;
}

function reassignIds(node) {
  node.id = nextId();
  for (const child of node.children) reassignIds(child);
  return node;
}

export function createBuilderState(options = {}) {
  const { initial, maxHistory = 100 } = options;

  const tree = signal(normalizeRoots(initial));
  const selection = signal(null);
  const hover = signal(null);

  const past = signal([]);
  const future = signal([]);

  const canUndo = computed(() => past().length > 0);
  const canRedo = computed(() => future().length > 0);

  const subscribers = new Set();
  function emit(event) {
    for (const cb of subscribers) cb(event);
  }

  function snapshot() {
    return clone(tree.peek());
  }

  function commit(mutator, event) {
    const before = snapshot();
    const draft = clone(before);
    const result = mutator(draft);
    if (result === false) return false;
    batch(() => {
      past.set((p) => {
        const next = [...p, before];
        while (next.length > maxHistory) next.shift();
        return next;
      });
      if (future.peek().length) future.set([]);
      tree.set(draft);
    });
    if (event) emit(event);
    return result == null ? true : result;
  }

  function getNode(id) {
    const found = findNode(tree.peek(), id);
    return found ? found.node : null;
  }

  function getParent(id) {
    const found = findNode(tree.peek(), id);
    return found ? found.parent : null;
  }

  function getPath(id) {
    return findPath(tree.peek(), id) || [];
  }

  function addNode(parentId, spec, index) {
    const node = normalizeNode(spec);
    const ok = commit(
      (draft) => {
        if (parentId == null) {
          if (typeof index === 'number') draft.splice(index, 0, node);
          else draft.push(node);
          return node;
        }
        const found = findNode(draft, parentId);
        if (!found) return false;
        if (typeof index === 'number') found.node.children.splice(index, 0, node);
        else found.node.children.push(node);
        return node;
      },
      { type: 'add', node, parentId: parentId ?? null },
    );
    return ok === false ? null : node;
  }

  function removeNode(id) {
    return commit(
      (draft) => {
        const found = findNode(draft, id);
        if (!found) return false;
        found.siblings.splice(found.index, 1);
        if (selection.peek() === id) selection.set(null);
        if (hover.peek() === id) hover.set(null);
        return true;
      },
      { type: 'remove', id },
    );
  }

  function updateProps(id, patch) {
    return commit(
      (draft) => {
        const found = findNode(draft, id);
        if (!found) return false;
        for (const key of Object.keys(patch)) {
          const value = patch[key];
          if (value === undefined) delete found.node.props[key];
          else found.node.props[key] = value;
        }
        return true;
      },
      { type: 'update', id, patch: { ...patch } },
    );
  }

  function setBinding(id, propKey, binding) {
    return commit(
      (draft) => {
        const found = findNode(draft, id);
        if (!found) return false;
        if (binding == null) {
          delete found.node.bindings[propKey];
        } else {
          if (!binding.ref || typeof binding.ref !== 'string') {
            throw new Error('Signal binding requires a "ref" string');
          }
          found.node.bindings[propKey] = {
            ref: binding.ref,
            ...(binding.expr ? { expr: binding.expr } : {}),
          };
        }
        return true;
      },
      { type: 'binding', id, propKey, binding: binding == null ? null : { ...binding } },
    );
  }

  function moveNode(id, newParentId, index) {
    if (id === newParentId) return false;
    if (newParentId && isAncestor(tree.peek(), id, newParentId)) return false;
    return commit(
      (draft) => {
        const found = findNode(draft, id);
        if (!found) return false;
        const [moved] = found.siblings.splice(found.index, 1);
        if (newParentId == null) {
          if (typeof index === 'number') draft.splice(index, 0, moved);
          else draft.push(moved);
        } else {
          const target = findNode(draft, newParentId);
          if (!target) return false;
          if (typeof index === 'number') target.node.children.splice(index, 0, moved);
          else target.node.children.push(moved);
        }
        return true;
      },
      {
        type: 'move',
        id,
        parentId: newParentId ?? null,
        index: typeof index === 'number' ? index : -1,
      },
    );
  }

  function duplicateNode(id) {
    const original = getNode(id);
    if (!original) return null;
    const copy = reassignIds(clone(original));
    const parent = getParent(id);
    const parentId = parent ? parent.id : null;
    const siblings = parent ? parent.children : tree.peek();
    const index = siblings.findIndex((n) => n.id === id) + 1;
    return addNode(parentId, copy, index);
  }

  function select(id) {
    if (selection.peek() === id) return;
    selection.set(id);
    emit({ type: 'select', id });
  }

  function hoverNode(id) {
    if (hover.peek() === id) return;
    hover.set(id);
    emit({ type: 'hover', id });
  }

  function undo() {
    const stack = past.peek();
    if (!stack.length) return false;
    const previous = stack[stack.length - 1];
    const current = snapshot();
    batch(() => {
      past.set(stack.slice(0, -1));
      future.set([...future.peek(), current]);
      tree.set(previous);
    });
    emit({ type: 'undo' });
    return true;
  }

  function redo() {
    const stack = future.peek();
    if (!stack.length) return false;
    const next = stack[stack.length - 1];
    const current = snapshot();
    batch(() => {
      future.set(stack.slice(0, -1));
      past.set([...past.peek(), current]);
      tree.set(next);
    });
    emit({ type: 'redo' });
    return true;
  }

  function clear() {
    commit(
      (draft) => {
        draft.length = 0;
        selection.set(null);
        hover.set(null);
        return true;
      },
      { type: 'clear' },
    );
  }

  function toJSON() {
    return JSON.stringify({ version: '0.1.0', tree: tree.peek() }, null, 2);
  }

  function fromJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const roots = Array.isArray(parsed?.tree) ? parsed.tree.map(normalizeNode) : [];
    batch(() => {
      past.set([]);
      future.set([]);
      selection.set(null);
      hover.set(null);
      tree.set(roots);
    });
    emit({ type: 'load' });
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  return {
    tree,
    selection,
    hover,
    canUndo,
    canRedo,
    getNode,
    getParent,
    getPath,
    addNode,
    removeNode,
    updateProps,
    setBinding,
    moveNode,
    duplicateNode,
    select,
    hoverNode,
    undo,
    redo,
    clear,
    toJSON,
    fromJSON,
    subscribe,
  };
}
