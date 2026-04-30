// ../../packages/runtime/src/signals.js
var currentEffect = null;
var batchDepth = 0;
var pendingEffects = /* @__PURE__ */ new Set();
var plugins = [];
function cleanupEffect(effectRef) {
  for (const subscribers of effectRef.subscriptions) {
    subscribers.delete(effectRef);
  }
  effectRef.subscriptions.clear();
  if (typeof effectRef.cleanup === "function") {
    const cleanup = effectRef.cleanup;
    effectRef.cleanup = null;
    cleanup();
  }
}
function scheduleEffect(effectRef) {
  if (batchDepth > 0) {
    pendingEffects.add(effectRef);
  } else {
    effectRef.run();
  }
}
function flushEffects() {
  batchDepth++;
  try {
    while (pendingEffects.size > 0) {
      const effects = [...pendingEffects];
      pendingEffects.clear();
      for (const effectRef of effects) effectRef.run();
    }
  } finally {
    batchDepth--;
  }
}
function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushEffects();
  }
}
function signal(initial) {
  let value = initial;
  const subs = /* @__PURE__ */ new Set();
  const accessor = () => {
    if (currentEffect) {
      subs.add(currentEffect);
      currentEffect.subscriptions.add(subs);
    }
    return value;
  };
  accessor.set = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    if (resolved !== value) {
      const prev = value;
      value = resolved;
      for (const plugin of plugins) {
        if (plugin.onSignalWrite) plugin.onSignalWrite(accessor, prev, value);
      }
      for (const effectRef of [...subs]) scheduleEffect(effectRef);
    }
  };
  accessor.peek = () => value;
  return accessor;
}
function computed(fn) {
  const s = signal(void 0);
  effect(() => s.set(fn()));
  return s;
}
function effect(fn) {
  const effectRef = {
    cleanup: null,
    disposed: false,
    subscriptions: /* @__PURE__ */ new Set(),
    run() {
      if (effectRef.disposed) return;
      cleanupEffect(effectRef);
      const previous = currentEffect;
      currentEffect = effectRef;
      try {
        const cleanup = fn();
        effectRef.cleanup = typeof cleanup === "function" ? cleanup : null;
      } finally {
        currentEffect = previous;
      }
    }
  };
  const execute = () => {
    effectRef.run();
  };
  execute.dispose = () => {
    if (effectRef.disposed) return;
    effectRef.disposed = true;
    cleanupEffect(effectRef);
  };
  execute();
  return execute;
}

// ../../packages/runtime/src/features.js
function cssSupports(target, rule) {
  return Boolean(target?.CSS?.supports?.(rule));
}
function detectBrowserFeatures(target = globalThis) {
  const elementProto = target?.HTMLElement?.prototype;
  const dialogProto = target?.HTMLDialogElement?.prototype;
  return {
    dialog: Boolean(dialogProto?.showModal),
    popover: Boolean(elementProto?.showPopover),
    anchorPositioning: cssSupports(target, "anchor-name: --bn-anchor") && cssSupports(target, "position-anchor: --bn-anchor"),
    baseSelect: cssSupports(target, "appearance: base-select") || cssSupports(target, "-webkit-appearance: base-select")
  };
}
var browserFeatures = detectBrowserFeatures();

// ../../packages/builder/src/state.js
var idCounter = 0;
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
    children: Array.isArray(spec.children) ? spec.children.map(normalizeNode) : []
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
function createBuilderState(options = {}) {
  const { initial, maxHistory = 100 } = options;
  const tree = signal(normalizeRoots(initial));
  const selection = signal(null);
  const hover = signal(null);
  const past = signal([]);
  const future = signal([]);
  const canUndo = computed(() => past().length > 0);
  const canRedo = computed(() => future().length > 0);
  const subscribers = /* @__PURE__ */ new Set();
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
          if (typeof index === "number") draft.splice(index, 0, node);
          else draft.push(node);
          return node;
        }
        const found = findNode(draft, parentId);
        if (!found) return false;
        if (typeof index === "number") found.node.children.splice(index, 0, node);
        else found.node.children.push(node);
        return node;
      },
      { type: "add", node, parentId: parentId ?? null }
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
      { type: "remove", id }
    );
  }
  function updateProps(id, patch) {
    return commit(
      (draft) => {
        const found = findNode(draft, id);
        if (!found) return false;
        for (const key of Object.keys(patch)) {
          const value = patch[key];
          if (value === void 0) delete found.node.props[key];
          else found.node.props[key] = value;
        }
        return true;
      },
      { type: "update", id, patch: { ...patch } }
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
          if (!binding.ref || typeof binding.ref !== "string") {
            throw new Error('Signal binding requires a "ref" string');
          }
          found.node.bindings[propKey] = {
            ref: binding.ref,
            ...binding.expr ? { expr: binding.expr } : {}
          };
        }
        return true;
      },
      { type: "binding", id, propKey, binding: binding == null ? null : { ...binding } }
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
          if (typeof index === "number") draft.splice(index, 0, moved);
          else draft.push(moved);
        } else {
          const target = findNode(draft, newParentId);
          if (!target) return false;
          if (typeof index === "number") target.node.children.splice(index, 0, moved);
          else target.node.children.push(moved);
        }
        return true;
      },
      {
        type: "move",
        id,
        parentId: newParentId ?? null,
        index: typeof index === "number" ? index : -1
      }
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
    emit({ type: "select", id });
  }
  function hoverNode(id) {
    if (hover.peek() === id) return;
    hover.set(id);
    emit({ type: "hover", id });
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
    emit({ type: "undo" });
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
    emit({ type: "redo" });
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
      { type: "clear" }
    );
  }
  function toJSON() {
    return JSON.stringify({ version: "0.1.0", tree: tree.peek() }, null, 2);
  }
  function fromJSON(json) {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    const roots = Array.isArray(parsed?.tree) ? parsed.tree.map(normalizeNode) : [];
    batch(() => {
      past.set([]);
      future.set([]);
      selection.set(null);
      hover.set(null);
      tree.set(roots);
    });
    emit({ type: "load" });
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
    subscribe
  };
}

// ../../packages/builder/src/palette.js
function createPalette() {
  const map = /* @__PURE__ */ new Map();
  function register(spec) {
    if (!spec || !spec.type) {
      throw new Error('Component definition requires a "type"');
    }
    const def = {
      type: spec.type,
      label: spec.label || spec.type,
      category: spec.category || "general",
      tag: spec.tag || spec.type,
      container: Boolean(spec.container),
      props: Array.isArray(spec.props) ? spec.props.slice() : [],
      defaults: spec.defaults ? { ...spec.defaults } : {},
      defaultContent: spec.defaultContent,
      role: spec.role
    };
    map.set(def.type, def);
    return def;
  }
  function unregister(type) {
    return map.delete(type);
  }
  function get(type) {
    return map.get(type) || null;
  }
  function list() {
    return Array.from(map.values());
  }
  function byCategory(category) {
    return list().filter((d) => d.category === category);
  }
  function categories() {
    const set = /* @__PURE__ */ new Set();
    for (const def of map.values()) set.add(def.category);
    return Array.from(set);
  }
  function search(query) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return list();
    return list().filter(
      (d) => d.type.toLowerCase().includes(q) || d.label.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }
  return { register, unregister, get, list, byCategory, categories, search };
}
function defaultPalette() {
  const palette = createPalette();
  palette.register({
    type: "section",
    label: "Section",
    category: "layout",
    tag: "section",
    container: true,
    role: "region",
    props: [
      { name: "aria-label", kind: "string", label: "Label" },
      { name: "class", kind: "string", label: "Class" }
    ],
    defaults: { class: "bn-section" }
  });
  palette.register({
    type: "stack",
    label: "Stack",
    category: "layout",
    tag: "div",
    container: true,
    props: [
      { name: "direction", kind: "enum", options: ["row", "column"], default: "column", label: "Direction" },
      { name: "gap", kind: "string", default: "1rem", label: "Gap" },
      { name: "class", kind: "string", label: "Class" }
    ],
    defaults: { direction: "column", gap: "1rem", class: "bn-stack" }
  });
  palette.register({
    type: "grid",
    label: "Grid",
    category: "layout",
    tag: "div",
    container: true,
    props: [
      { name: "columns", kind: "number", default: 12, label: "Columns" },
      { name: "gap", kind: "string", default: "1rem", label: "Gap" },
      { name: "class", kind: "string", label: "Class" }
    ],
    defaults: { columns: 12, gap: "1rem", class: "bn-grid" }
  });
  palette.register({
    type: "heading",
    label: "Heading",
    category: "text",
    tag: "h2",
    container: false,
    props: [
      { name: "level", kind: "enum", options: ["h1", "h2", "h3", "h4", "h5", "h6"], default: "h2", label: "Level" },
      { name: "text", kind: "string", label: "Text" }
    ],
    defaults: { level: "h2", text: "Heading" }
  });
  palette.register({
    type: "text",
    label: "Text",
    category: "text",
    tag: "p",
    container: false,
    props: [
      { name: "text", kind: "string", label: "Text" }
    ],
    defaults: { text: "Lorem ipsum." }
  });
  palette.register({
    type: "button",
    label: "Button",
    category: "inputs",
    tag: "button",
    container: false,
    props: [
      { name: "text", kind: "string", label: "Label" },
      { name: "variant", kind: "enum", options: ["primary", "secondary", "ghost", "destructive"], default: "primary", label: "Variant" },
      { name: "type", kind: "enum", options: ["button", "submit", "reset"], default: "button", label: "Type" },
      { name: "disabled", kind: "boolean", default: false, label: "Disabled" }
    ],
    defaults: { text: "Click me", variant: "primary", type: "button" }
  });
  palette.register({
    type: "input",
    label: "Input",
    category: "inputs",
    tag: "input",
    container: false,
    props: [
      { name: "type", kind: "enum", options: ["text", "email", "password", "number", "search", "tel", "url"], default: "text", label: "Type" },
      { name: "name", kind: "string", label: "Name" },
      { name: "placeholder", kind: "string", label: "Placeholder" },
      { name: "value", kind: "signal", label: "Bound value" },
      { name: "required", kind: "boolean", default: false, label: "Required" }
    ],
    defaults: { type: "text" }
  });
  palette.register({
    type: "textarea",
    label: "Textarea",
    category: "inputs",
    tag: "textarea",
    container: false,
    props: [
      { name: "name", kind: "string", label: "Name" },
      { name: "placeholder", kind: "string", label: "Placeholder" },
      { name: "rows", kind: "number", default: 4, label: "Rows" },
      { name: "value", kind: "signal", label: "Bound value" }
    ],
    defaults: { rows: 4 }
  });
  palette.register({
    type: "checkbox",
    label: "Checkbox",
    category: "inputs",
    tag: "input",
    container: false,
    props: [
      { name: "name", kind: "string", label: "Name" },
      { name: "label", kind: "string", label: "Label" },
      { name: "checked", kind: "signal", label: "Bound state" }
    ],
    defaults: { type: "checkbox" }
  });
  palette.register({
    type: "label",
    label: "Label",
    category: "inputs",
    tag: "label",
    container: true,
    props: [
      { name: "for", kind: "string", label: "For" },
      { name: "text", kind: "string", label: "Text" }
    ],
    defaults: { text: "Label" }
  });
  palette.register({
    type: "form",
    label: "Form",
    category: "inputs",
    tag: "form",
    container: true,
    props: [
      { name: "action", kind: "string", label: "Action" },
      { name: "method", kind: "enum", options: ["get", "post"], default: "post", label: "Method" }
    ],
    defaults: { method: "post" }
  });
  palette.register({
    type: "link",
    label: "Link",
    category: "navigation",
    tag: "a",
    container: false,
    props: [
      { name: "href", kind: "string", label: "URL" },
      { name: "text", kind: "string", label: "Text" },
      { name: "target", kind: "enum", options: ["", "_blank", "_self"], default: "", label: "Target" }
    ],
    defaults: { href: "#", text: "Link" }
  });
  palette.register({
    type: "image",
    label: "Image",
    category: "media",
    tag: "img",
    container: false,
    props: [
      { name: "src", kind: "string", label: "Source" },
      { name: "alt", kind: "string", label: "Alt text" },
      { name: "width", kind: "number", label: "Width" },
      { name: "height", kind: "number", label: "Height" }
    ],
    defaults: { src: "", alt: "" }
  });
  palette.register({
    type: "signal-text",
    label: "Signal Text",
    category: "reactive",
    tag: "span",
    container: false,
    props: [
      { name: "value", kind: "signal", label: "Bound expression" }
    ],
    defaults: {}
  });
  return palette;
}

// ../../packages/builder/src/escape.js
function escapeHtml(value) {
  const s = value == null ? "" : String(value);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(value) {
  return escapeHtml(value);
}
var JS_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function isValidIdentifier(name) {
  return typeof name === "string" && JS_IDENT.test(name);
}

// ../../packages/builder/src/codegen.js
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var ATTR_PROPS = /* @__PURE__ */ new Set([
  "class",
  "id",
  "name",
  "href",
  "src",
  "alt",
  "placeholder",
  "action",
  "method",
  "target",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "role",
  "rows",
  "cols",
  "width",
  "height",
  "min",
  "max",
  "step",
  "maxlength",
  "minlength",
  "pattern",
  "autocomplete",
  "for"
]);
var BOOL_ATTRS = /* @__PURE__ */ new Set(["disabled", "required", "readonly", "checked", "selected", "multiple", "autofocus", "hidden"]);
function attrName(key) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
function renderAttr(key, value) {
  if (value === false || value == null) return "";
  if (value === true) return ` ${attrName(key)}`;
  return ` ${attrName(key)}="${escapeAttr(value)}"`;
}
function renderBoundAttr(key, binding) {
  if (!isValidIdentifier(binding.ref)) {
    throw new Error(`Invalid signal ref "${binding.ref}" \u2014 must be a JavaScript identifier`);
  }
  const expr = binding.expr || `${binding.ref}()`;
  return ` :${attrName(key)}="${escapeAttr(expr)}"`;
}
function defaultTagFor(node, def) {
  if (node.type === "heading" && typeof node.props.level === "string") return node.props.level;
  if (def?.tag) return def.tag;
  return node.type;
}
function renderText(node) {
  if (node.bindings && node.bindings.text) {
    const b = node.bindings.text;
    if (!isValidIdentifier(b.ref)) {
      throw new Error(`Invalid signal ref "${b.ref}"`);
    }
    return `{{ ${b.expr || `${b.ref}()`} }}`;
  }
  if (typeof node.props.text === "string") return escapeHtml(node.props.text);
  return "";
}
function renderNode(node, palette, depth, indent) {
  const def = palette ? palette.get(node.type) : null;
  const tag = defaultTagFor(node, def);
  const isVoid = VOID_ELEMENTS.has(tag);
  const isContainer = def ? def.container : !isVoid;
  const pad = indent.repeat(depth);
  let attrs = "";
  if (def && def.role && !node.props.role) {
    attrs += renderAttr("role", def.role);
  }
  for (const key of Object.keys(node.props)) {
    if (key === "text" || key === "children" || key === "level") continue;
    if (node.bindings && node.bindings[key]) continue;
    const value = node.props[key];
    if (BOOL_ATTRS.has(key)) {
      if (value) attrs += ` ${attrName(key)}`;
    } else if (ATTR_PROPS.has(key) || /^data-/.test(key)) {
      attrs += renderAttr(key, value);
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attrs += renderAttr(key, value);
    }
  }
  if (node.bindings) {
    for (const key of Object.keys(node.bindings)) {
      if (key === "text" || key === "value" || key === "checked") continue;
      attrs += renderBoundAttr(key, node.bindings[key]);
    }
  }
  if (node.bindings?.value && (tag === "input" || tag === "textarea" || tag === "select")) {
    const b = node.bindings.value;
    if (!isValidIdentifier(b.ref)) throw new Error(`Invalid signal ref "${b.ref}"`);
    attrs += ` @bind="${escapeAttr(b.ref)}"`;
  }
  if (node.bindings?.checked && tag === "input") {
    const b = node.bindings.checked;
    if (!isValidIdentifier(b.ref)) throw new Error(`Invalid signal ref "${b.ref}"`);
    attrs += ` @bind="${escapeAttr(b.ref)}"`;
  }
  if (isVoid) {
    return `${pad}<${tag}${attrs} />`;
  }
  const open = `<${tag}${attrs}>`;
  const close = `</${tag}>`;
  if (node.children && node.children.length > 0) {
    const childLines = node.children.map((c) => renderNode(c, palette, depth + 1, indent));
    return `${pad}${open}
${childLines.join("\n")}
${pad}${close}`;
  }
  if (!isContainer || node.props.text != null || node.bindings?.text) {
    const text = renderText(node);
    if (text) return `${pad}${open}${text}${close}`;
  }
  if (node.type === "label" && typeof node.props.text === "string") {
    return `${pad}${open}${escapeHtml(node.props.text)}${close}`;
  }
  return `${pad}${open}${close}`;
}
function renderSignalDeclarations(signals, indent) {
  if (!signals || Object.keys(signals).length === 0) return "";
  const lines = ['<script type="module">', `${indent}import { signal } from '@basenative/runtime';`, ""];
  for (const name of Object.keys(signals)) {
    if (!isValidIdentifier(name)) {
      throw new Error(`Invalid signal name "${name}"`);
    }
    const value = signals[name];
    lines.push(`${indent}const ${name} = signal(${JSON.stringify(value)});`);
  }
  lines.push("<\/script>");
  return lines.join("\n") + "\n";
}
function generateBaseNative(state, options = {}) {
  const { indent = "  ", document: asDocument = false, title = "BaseNative Page", signals, palette } = options;
  const tree = state.tree.peek ? state.tree.peek() : state.tree();
  const body = tree.map((node) => renderNode(node, palette || null, 0, indent)).join("\n");
  const script = renderSignalDeclarations(signals, indent);
  if (!asDocument) {
    return script ? `${script}${body}` : body;
  }
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    `${indent}<meta charset="UTF-8">`,
    `${indent}<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `${indent}<title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    script ? script.trimEnd() : "",
    body,
    "</body>",
    "</html>"
  ].filter(Boolean).join("\n");
}

// ../../packages/builder/src/tree-view.js
function renderRow(node, depth, selectedId, hoverId) {
  const selected = node.id === selectedId;
  const hovered = node.id === hoverId;
  const classes = ["bn-tree__row"];
  if (selected) classes.push("bn-tree__row--selected");
  if (hovered) classes.push("bn-tree__row--hover");
  const indent = "  ".repeat(depth);
  const summary = node.props && typeof node.props.text === "string" ? ` \u2014 ${escapeHtml(node.props.text)}` : "";
  const ariaSelected = selected ? ' aria-selected="true"' : "";
  const expanded = node.children && node.children.length > 0 ? ' aria-expanded="true"' : "";
  return `${indent}<li role="treeitem"${ariaSelected}${expanded} data-bn-tree-id="${escapeHtml(node.id)}" class="${classes.join(" ")}"><button type="button" data-bn-tree-select="${escapeHtml(node.id)}" class="bn-tree__label"><span class="bn-tree__type">${escapeHtml(node.type)}</span><span class="bn-tree__summary">${summary}</span></button>`;
}
function renderChildren(children, depth, selectedId, hoverId) {
  if (!children || children.length === 0) return "";
  const indent = "  ".repeat(depth);
  const inner = children.map((c) => renderSubtree(c, depth + 1, selectedId, hoverId)).join("\n");
  return `
${indent}<ul role="group" class="bn-tree__children">
${inner}
${indent}</ul>`;
}
function renderSubtree(node, depth, selectedId, hoverId) {
  const indent = "  ".repeat(depth);
  return `${renderRow(node, depth, selectedId, hoverId)}${renderChildren(node.children, depth, selectedId, hoverId)}
${indent}</li>`;
}
function renderTreeView(state) {
  const tree = state.tree.peek ? state.tree.peek() : state.tree();
  const selectedId = state.selection.peek ? state.selection.peek() : state.selection();
  const hoverId = state.hover.peek ? state.hover.peek() : state.hover();
  if (!tree.length) {
    return '<div class="bn-tree bn-tree--empty" role="tree" aria-label="Component tree"><p class="bn-tree__empty">No components yet. Drag from the palette.</p></div>';
  }
  const items = tree.map((root) => renderSubtree(root, 1, selectedId, hoverId)).join("\n");
  return `<ul role="tree" aria-label="Component tree" class="bn-tree">
${items}
</ul>`;
}

// ../../packages/builder/src/inspector.js
function renderField(nodeId, prop, value, binding) {
  const id = `bn-prop-${nodeId}-${prop.name}`;
  const label = escapeHtml(prop.label || prop.name);
  const dataAttrs = `data-bn-prop="${escapeHtml(prop.name)}" data-bn-node="${escapeHtml(nodeId)}"`;
  if (prop.kind === "signal") {
    const ref = binding ? binding.ref : "";
    return `<label class="bn-inspector__field" for="${id}"><span class="bn-inspector__label">${label} <small>(signal)</small></span><input id="${id}" type="text" ${dataAttrs} data-bn-binding="true" placeholder="signalName" value="${escapeHtml(ref)}" class="bn-inspector__input"></label>`;
  }
  if (prop.kind === "enum" && Array.isArray(prop.options)) {
    const options = prop.options.map(
      (o) => `<option value="${escapeHtml(o)}"${value === o ? " selected" : ""}>${escapeHtml(o || "\u2014")}</option>`
    ).join("");
    return `<label class="bn-inspector__field" for="${id}"><span class="bn-inspector__label">${label}</span><select id="${id}" ${dataAttrs} class="bn-inspector__input">${options}</select></label>`;
  }
  if (prop.kind === "boolean") {
    const checked = value ? " checked" : "";
    return `<label class="bn-inspector__field bn-inspector__field--inline" for="${id}"><input id="${id}" type="checkbox" ${dataAttrs}${checked} class="bn-inspector__checkbox"><span class="bn-inspector__label">${label}</span></label>`;
  }
  if (prop.kind === "number") {
    const v2 = value == null ? "" : escapeHtml(value);
    return `<label class="bn-inspector__field" for="${id}"><span class="bn-inspector__label">${label}</span><input id="${id}" type="number" ${dataAttrs} value="${v2}" class="bn-inspector__input"></label>`;
  }
  const v = value == null ? "" : escapeHtml(value);
  return `<label class="bn-inspector__field" for="${id}"><span class="bn-inspector__label">${label}</span><input id="${id}" type="text" ${dataAttrs} value="${v}" class="bn-inspector__input"></label>`;
}
function renderInspector(state, palette) {
  const selectedId = state.selection.peek ? state.selection.peek() : state.selection();
  if (!selectedId) {
    return '<aside class="bn-inspector" aria-label="Property inspector"><p class="bn-inspector__empty">Select a component to edit its properties.</p></aside>';
  }
  const node = state.getNode(selectedId);
  if (!node) {
    return '<aside class="bn-inspector" aria-label="Property inspector"><p class="bn-inspector__empty">Component not found.</p></aside>';
  }
  const def = palette.get(node.type);
  const heading = `<header class="bn-inspector__header"><h3 class="bn-inspector__title">${escapeHtml(def?.label || node.type)}</h3><p class="bn-inspector__id">${escapeHtml(node.id)}</p></header>`;
  if (!def || !def.props.length) {
    return `<aside class="bn-inspector" aria-label="Property inspector">${heading}<p class="bn-inspector__empty">No editable properties.</p></aside>`;
  }
  const fields = def.props.map((prop) => renderField(node.id, prop, node.props[prop.name], node.bindings[prop.name])).join("\n");
  const actions = `<footer class="bn-inspector__actions"><button type="button" data-bn-action="duplicate" data-bn-node="${escapeHtml(node.id)}" class="bn-inspector__btn">Duplicate</button><button type="button" data-bn-action="remove" data-bn-node="${escapeHtml(node.id)}" class="bn-inspector__btn bn-inspector__btn--danger">Remove</button></footer>`;
  return `<aside class="bn-inspector" aria-label="Property inspector">${heading}<form class="bn-inspector__form" data-bn-inspector-form="${escapeHtml(node.id)}">${fields}</form>` + actions + `</aside>`;
}

// ../../packages/builder/src/palette-element.js
var TAG = "bn-builder-palette";
function renderPaletteHTML(palette) {
  const categories = palette.categories();
  if (!categories.length) {
    return '<p class="bn-palette__empty">No components registered.</p>';
  }
  return categories.map((cat) => {
    const items = palette.byCategory(cat).map(
      (def) => `<li class="bn-palette__item"><div role="button" tabindex="0" draggable="true" data-bn-palette-type="${escapeHtml(def.type)}" class="bn-palette__btn" aria-label="Add ${escapeHtml(def.label)}"><span class="bn-palette__label">${escapeHtml(def.label)}</span><span class="bn-palette__type">${escapeHtml(def.type)}</span></div></li>`
    ).join("");
    return `<section class="bn-palette__group" aria-label="${escapeHtml(cat)} components"><h3 class="bn-palette__heading">${escapeHtml(cat)}</h3><ul class="bn-palette__list" role="list">${items}</ul></section>`;
  }).join("");
}
var BnBuilderPalette = class extends HTMLElement {
  constructor() {
    super();
    this.palette = null;
  }
  connectedCallback() {
    this.style.display = "contents";
    this.setAttribute("role", "toolbar");
    this.setAttribute("aria-label", "Component palette");
    this._render();
    this._wire();
  }
  attach(palette) {
    this.palette = palette;
    if (this.isConnected) this._render();
  }
  _render() {
    if (!this.palette) return;
    this.innerHTML = `<div class="bn-palette">${renderPaletteHTML(this.palette)}</div>`;
  }
  _wire() {
    if (this._wired) return;
    this._wired = true;
    this.addEventListener("dragstart", (e) => {
      const btn = e.target.closest("[data-bn-palette-type]");
      if (!btn) return;
      e.dataTransfer.setData("application/x-bn-component-type", btn.dataset.bnPaletteType);
      e.dataTransfer.effectAllowed = "copy";
    });
    this.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bn-palette-type]");
      if (!btn) return;
      this._dispatchAdd(btn.dataset.bnPaletteType);
    });
    this.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const btn = e.target.closest("[data-bn-palette-type]");
      if (!btn) return;
      e.preventDefault();
      this._dispatchAdd(btn.dataset.bnPaletteType);
    });
  }
  _dispatchAdd(type) {
    if (!type || !this.palette) return;
    const def = this.palette.get(type);
    if (!def) return;
    this.dispatchEvent(new CustomEvent("bn-palette-add", {
      detail: { type, def },
      bubbles: true
    }));
  }
};
if (typeof customElements !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, BnBuilderPalette);
}

// ../../packages/builder/src/dom-render.js
var VOID_ELEMENTS2 = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function tagFor(node, def) {
  if (node.type === "heading" && typeof node.props.level === "string") return node.props.level;
  if (def?.tag) return def.tag;
  return node.type;
}
function renderNodeToElement(doc, node, palette) {
  const def = palette.get(node.type);
  const tag = tagFor(node, def);
  const isVoid = VOID_ELEMENTS2.has(tag);
  const el = doc.createElement(tag);
  el.dataset.bnNode = node.id;
  el.dataset.bnType = node.type;
  if (def?.role && !node.props.role) {
    el.setAttribute("role", def.role);
  }
  for (const key of Object.keys(node.props)) {
    if (key === "text" || key === "level") continue;
    const value = node.props[key];
    if (value === false || value == null) continue;
    if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }
  if (typeof node.props.text === "string" && (!node.children || node.children.length === 0) && !isVoid) {
    el.textContent = node.props.text;
  }
  if (node.bindings && node.bindings.text) {
    el.textContent = `{{ ${node.bindings.text.expr || `${node.bindings.text.ref}()`} }}`;
  }
  if (!isVoid && node.children && node.children.length > 0) {
    el.textContent = "";
    for (const child of node.children) {
      const childEl = renderNodeToElement(doc, child, palette);
      el.appendChild(childEl);
    }
  }
  return el;
}
function renderEmptyPlaceholder(doc, message) {
  const el = doc.createElement("div");
  el.className = "bn-builder__empty";
  el.setAttribute("role", "note");
  el.innerHTML = `<p>${escapeHtml(message)}</p>`;
  return el;
}

// ../../packages/builder/src/canvas-element.js
var CANVAS_TAG = "bn-builder-canvas";
var BnBuilderCanvas = class extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
    this._root = null;
    this._effect = null;
    this._dragOverId = null;
  }
  connectedCallback() {
    this.style.display = "contents";
    this.setAttribute("role", "application");
    this.setAttribute("aria-label", "Builder canvas");
    if (!this._root) {
      this._root = document.createElement("div");
      this._root.className = "bn-builder__canvas-surface";
      this._root.tabIndex = 0;
      this.appendChild(this._root);
    }
    this._wireSurfaceEvents();
    this._render();
    if (this.state && !this._effect) {
      this._effect = effect(() => {
        this.state.tree();
        this.state.selection();
        this.state.hover();
        this._render();
      });
    }
  }
  disconnectedCallback() {
    if (this._effect) {
      this._effect.dispose();
      this._effect = null;
    }
  }
  attach(state, palette) {
    this.state = state;
    this.palette = palette;
    if (this.isConnected) {
      if (this._effect) this._effect.dispose();
      this._effect = effect(() => {
        state.tree();
        state.selection();
        state.hover();
        this._render();
      });
    }
  }
  _render() {
    if (!this._root || !this.state || !this.palette) return;
    const tree = this.state.tree();
    this._root.replaceChildren();
    if (tree.length === 0) {
      const empty = renderEmptyPlaceholder(document, "Drag a component here to start building.");
      empty.dataset.bnDropzone = "root";
      this._root.appendChild(empty);
      return;
    }
    for (const node of tree) {
      const el = renderNodeToElement(document, node, this.palette);
      this._decorate(el, node);
      this._root.appendChild(el);
    }
  }
  _decorate(el, node) {
    if (this.state.selection() === node.id) {
      el.dataset.bnSelected = "true";
    } else {
      delete el.dataset.bnSelected;
    }
    if (this.state.hover() === node.id) {
      el.dataset.bnHover = "true";
    }
    el.setAttribute("draggable", "true");
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const childEl = el.querySelector(`[data-bn-node="${node.children[i].id}"]`);
        if (childEl) this._decorate(childEl, node.children[i]);
      }
    }
  }
  _wireSurfaceEvents() {
    if (this._root._bnWired) return;
    this._root._bnWired = true;
    this._root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-bn-node]");
      if (!el) {
        this.state.select(null);
        return;
      }
      e.stopPropagation();
      this.state.select(el.dataset.bnNode);
    });
    this._root.addEventListener("mouseover", (e) => {
      const el = e.target.closest("[data-bn-node]");
      if (el) this.state.hoverNode(el.dataset.bnNode);
    });
    this._root.addEventListener("mouseleave", () => {
      this.state.hoverNode(null);
    });
    this._root.addEventListener("dragstart", (e) => {
      const el = e.target.closest("[data-bn-node]");
      if (!el) return;
      e.dataTransfer.setData("application/x-bn-node-id", el.dataset.bnNode);
      e.dataTransfer.effectAllowed = "move";
    });
    this._root.addEventListener("dragover", (e) => {
      const types = e.dataTransfer.types;
      const isPaletteDrag = types && (types.contains ? types.contains("application/x-bn-component-type") : Array.from(types).includes("application/x-bn-component-type"));
      if (!isPaletteDrag) {
        const isNodeDrag = types && (types.contains ? types.contains("application/x-bn-node-id") : Array.from(types).includes("application/x-bn-node-id"));
        if (!isNodeDrag) return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = isPaletteDrag ? "copy" : "move";
    });
    this._root.addEventListener("drop", (e) => {
      e.preventDefault();
      const moveId = e.dataTransfer.getData("application/x-bn-node-id");
      const newType = e.dataTransfer.getData("application/x-bn-component-type");
      const target = e.target.closest("[data-bn-node]");
      const targetId = target ? target.dataset.bnNode : null;
      if (newType) {
        const def = this.palette.get(newType);
        if (!def) return;
        const parentId = target && this._isContainer(target) ? targetId : null;
        this.state.addNode(parentId, { type: newType, props: { ...def.defaults } });
        return;
      }
      if (moveId) {
        if (moveId === targetId) return;
        const targetNode = targetId ? this.state.getNode(targetId) : null;
        if (target && targetNode && this._isContainer(target)) {
          this.state.moveNode(moveId, targetId);
        } else if (targetNode) {
          const parent = this.state.getParent(targetId);
          const parentId = parent ? parent.id : null;
          const siblings = parent ? parent.children : this.state.tree();
          const idx = siblings.findIndex((n) => n.id === targetId);
          this.state.moveNode(moveId, parentId, idx + 1);
        } else {
          this.state.moveNode(moveId, null);
        }
      }
    });
    this.addEventListener("keydown", (e) => {
      if (!this.state) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const id = this.state.selection();
        if (id) {
          e.preventDefault();
          this.state.removeNode(id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) this.state.redo();
        else this.state.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.state.redo();
      }
    });
  }
  _isContainer(el) {
    if (!el) return false;
    const def = this.palette.get(el.dataset.bnType);
    return def ? def.container : false;
  }
};
if (typeof customElements !== "undefined" && !customElements.get(CANVAS_TAG)) {
  customElements.define(CANVAS_TAG, BnBuilderCanvas);
}

// ../../packages/builder/src/tree-element.js
var TAG2 = "bn-builder-tree";
var BnBuilderTree = class extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this._effect = null;
  }
  connectedCallback() {
    this.style.display = "contents";
    this._wire();
    this._render();
    if (this.state && !this._effect) {
      this._effect = effect(() => {
        this.state.tree();
        this.state.selection();
        this.state.hover();
        this._render();
      });
    }
  }
  disconnectedCallback() {
    if (this._effect) {
      this._effect.dispose();
      this._effect = null;
    }
  }
  attach(state) {
    this.state = state;
    if (this.isConnected) {
      if (this._effect) this._effect.dispose();
      this._effect = effect(() => {
        state.tree();
        state.selection();
        state.hover();
        this._render();
      });
    }
  }
  _render() {
    if (!this.state) {
      this.innerHTML = "";
      return;
    }
    this.innerHTML = renderTreeView(this.state);
  }
  _wire() {
    this.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bn-tree-select]");
      if (!btn || !this.state) return;
      this.state.select(btn.dataset.bnTreeSelect);
    });
    this.addEventListener("mouseover", (e) => {
      const item = e.target.closest("[data-bn-tree-id]");
      if (item && this.state) this.state.hoverNode(item.dataset.bnTreeId);
    });
    this.addEventListener("mouseleave", () => {
      if (this.state) this.state.hoverNode(null);
    });
  }
};
if (typeof customElements !== "undefined" && !customElements.get(TAG2)) {
  customElements.define(TAG2, BnBuilderTree);
}

// ../../packages/builder/src/inspector-element.js
var TAG3 = "bn-builder-inspector";
function coerce(prop, raw) {
  if (prop.kind === "number") {
    if (raw === "" || raw == null) return void 0;
    const n = Number(raw);
    return Number.isNaN(n) ? void 0 : n;
  }
  if (prop.kind === "boolean") {
    return Boolean(raw);
  }
  return raw === "" ? void 0 : raw;
}
var BnBuilderInspector = class extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
    this._effect = null;
  }
  connectedCallback() {
    this.style.display = "contents";
    this._wire();
    this._render();
    if (this.state && !this._effect) {
      this._bindEffect();
    }
  }
  disconnectedCallback() {
    if (this._effect) {
      this._effect.dispose();
      this._effect = null;
    }
  }
  attach(state, palette) {
    this.state = state;
    this.palette = palette;
    if (this.isConnected) {
      if (this._effect) this._effect.dispose();
      this._bindEffect();
    }
  }
  _bindEffect() {
    this._effect = effect(() => {
      this.state.tree();
      this.state.selection();
      this._render();
    });
  }
  _render() {
    if (!this.state || !this.palette) {
      this.innerHTML = "";
      return;
    }
    this.innerHTML = renderInspector(this.state, this.palette);
  }
  _wire() {
    this.addEventListener("input", (e) => this._handleChange(e));
    this.addEventListener("change", (e) => this._handleChange(e));
    this.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bn-action]");
      if (!btn || !this.state) return;
      const action = btn.dataset.bnAction;
      const id = btn.dataset.bnNode;
      if (action === "remove") this.state.removeNode(id);
      else if (action === "duplicate") this.state.duplicateNode(id);
    });
  }
  _handleChange(e) {
    const target = e.target.closest("[data-bn-prop]");
    if (!target || !this.state || !this.palette) return;
    const propName = target.dataset.bnProp;
    const nodeId = target.dataset.bnNode;
    const node = this.state.getNode(nodeId);
    if (!node) return;
    const def = this.palette.get(node.type);
    if (!def) return;
    const prop = def.props.find((p) => p.name === propName);
    if (!prop) return;
    if (target.dataset.bnBinding === "true") {
      const ref = target.value.trim();
      this.state.setBinding(nodeId, propName, ref ? { ref } : null);
      return;
    }
    const raw = target.type === "checkbox" ? target.checked : target.value;
    const value = coerce(prop, raw);
    this.state.updateProps(nodeId, { [propName]: value });
  }
};
if (typeof customElements !== "undefined" && !customElements.get(TAG3)) {
  customElements.define(TAG3, BnBuilderInspector);
}

// ../../packages/builder/src/builder-element.js
var TAG4 = "bn-builder";
var LAYOUT_HTML = `
<div class="bn-builder">
  <header class="bn-builder__toolbar" role="toolbar" aria-label="Builder actions">
    <button type="button" data-bn-builder-action="undo" class="bn-builder__btn">Undo</button>
    <button type="button" data-bn-builder-action="redo" class="bn-builder__btn">Redo</button>
    <button type="button" data-bn-builder-action="clear" class="bn-builder__btn">Clear</button>
    <button type="button" data-bn-builder-action="export" class="bn-builder__btn">Export Code</button>
  </header>
  <div class="bn-builder__panes">
    <aside class="bn-builder__pane bn-builder__pane--palette" aria-label="Components">
      <bn-builder-palette></bn-builder-palette>
    </aside>
    <main class="bn-builder__pane bn-builder__pane--canvas">
      <bn-builder-canvas></bn-builder-canvas>
    </main>
    <aside class="bn-builder__pane bn-builder__pane--side" aria-label="Inspector and tree">
      <bn-builder-inspector></bn-builder-inspector>
      <bn-builder-tree></bn-builder-tree>
    </aside>
  </div>
</div>`;
var BnBuilder = class extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
  }
  connectedCallback() {
    this.style.display = "contents";
    this.setAttribute("role", "application");
    this.setAttribute("aria-label", "BaseNative visual builder");
    if (!this.state) this.state = createBuilderState();
    if (!this.palette) this.palette = defaultPalette();
    if (!this._mounted) {
      this.innerHTML = LAYOUT_HTML;
      this._mounted = true;
    }
    const palette = this.querySelector("bn-builder-palette");
    const canvas = this.querySelector("bn-builder-canvas");
    const tree = this.querySelector("bn-builder-tree");
    const inspector = this.querySelector("bn-builder-inspector");
    if (palette && palette.attach) palette.attach(this.palette);
    if (canvas && canvas.attach) canvas.attach(this.state, this.palette);
    if (tree && tree.attach) tree.attach(this.state);
    if (inspector && inspector.attach) inspector.attach(this.state, this.palette);
    this._wireToolbar();
    this._wirePaletteAdd();
  }
  attach({ state, palette }) {
    if (state) this.state = state;
    if (palette) this.palette = palette;
    if (this.isConnected) this.connectedCallback();
  }
  generateCode(options) {
    if (!this.state) return "";
    return generateBaseNative(this.state, { palette: this.palette, ...options });
  }
  _wireToolbar() {
    if (this._toolbarWired) return;
    this._toolbarWired = true;
    this.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bn-builder-action]");
      if (!btn) return;
      const action = btn.dataset.bnBuilderAction;
      if (action === "undo") this.state.undo();
      else if (action === "redo") this.state.redo();
      else if (action === "clear") this.state.clear();
      else if (action === "export") {
        const code = this.generateCode();
        this.dispatchEvent(new CustomEvent("bn-builder-export", { detail: { code }, bubbles: true }));
      }
    });
    this.addEventListener("bn-palette-add", (e) => {
      const type = e.detail?.type;
      if (!type || !this.state || !this.palette) return;
      const def = this.palette.get(type);
      if (!def) return;
      this.state.addNode(null, { type, props: { ...def.defaults } });
    });
  }
  _wirePaletteAdd() {
    if (this._paletteAddWired) return;
    this._paletteAddWired = true;
    this.addEventListener("bn-palette-add", (e) => {
      if (!this.state || !this.palette) return;
      const { type, def } = e.detail || {};
      if (!type) return;
      const resolved = def || this.palette.get(type);
      if (!resolved) return;
      const selectedId = this.state.selection();
      const selectedNode = selectedId ? this.state.getNode(selectedId) : null;
      const selectedDef = selectedNode ? this.palette.get(selectedNode.type) : null;
      const parentId = selectedDef && selectedDef.container ? selectedId : null;
      this.state.addNode(parentId, { type, props: { ...resolved.defaults } });
    });
  }
};
if (typeof customElements !== "undefined") {
  if (!customElements.get("bn-builder-palette")) customElements.define("bn-builder-palette", BnBuilderPalette);
  if (!customElements.get("bn-builder-canvas")) customElements.define("bn-builder-canvas", BnBuilderCanvas);
  if (!customElements.get("bn-builder-tree")) customElements.define("bn-builder-tree", BnBuilderTree);
  if (!customElements.get("bn-builder-inspector")) customElements.define("bn-builder-inspector", BnBuilderInspector);
  if (!customElements.get(TAG4)) customElements.define(TAG4, BnBuilder);
}

// builder-entry.js
var ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
ready(() => {
  const builder = document.querySelector("[data-bn-builder-root]");
  const panel = document.querySelector("[data-bn-builder-export-panel]");
  const output = document.querySelector("[data-bn-builder-export-output] code");
  if (!builder || !panel || !output) return;
  builder.addEventListener("bn-builder-export", (event) => {
    panel.hidden = false;
    output.textContent = event.detail?.code ?? "";
  });
});
