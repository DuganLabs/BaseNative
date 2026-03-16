// src/runtime/signals.js
var currentEffect = null;
function signal(initial) {
  let value = initial;
  const subs = /* @__PURE__ */ new Set();
  const accessor = () => {
    if (currentEffect) subs.add(currentEffect);
    return value;
  };
  accessor.set = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    if (resolved !== value) {
      value = resolved;
      for (const fn of [...subs]) fn();
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
  const execute = () => {
    currentEffect = execute;
    try {
      fn();
    } finally {
      currentEffect = null;
    }
  };
  execute();
  return execute;
}

// src/runtime/evaluate.js
function evaluate(expr, ctx) {
  try {
    const keys = Object.keys(ctx);
    return new Function(...keys, `return(${expr})`)(...keys.map((k) => ctx[k]));
  } catch {
    return void 0;
  }
}
function interpolate(text, ctx) {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const val = evaluate(expr, ctx);
    return val != null ? val : "";
  });
}

// src/runtime/bind.js
function bindNode(node, ctx) {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent;
    if (raw.includes("{{")) effect(() => {
      node.textContent = interpolate(raw, ctx);
    });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === "TEMPLATE") return;
  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith("@")) {
      const event = attr.name.slice(1);
      const body = attr.value;
      const keys = Object.keys(ctx);
      node.addEventListener(event, function($event) {
        const $el = this;
        new Function("$event", "$el", ...keys, body)($event, $el, ...keys.map((k) => ctx[k]));
      });
      node.removeAttribute(attr.name);
    } else if (attr.name.startsWith(":")) {
      const attrName = attr.name.slice(1);
      const expr = attr.value;
      effect(() => {
        const result = evaluate(expr, ctx);
        if (result === false || result == null) node.removeAttribute(attrName);
        else node.setAttribute(attrName, result);
      });
      node.removeAttribute(attr.name);
    } else if (attr.value.includes("{{")) {
      const raw = attr.value, name = attr.name;
      effect(() => {
        node.setAttribute(name, interpolate(raw, ctx));
      });
    }
  }
  hydrateChildren(node, ctx);
}

// src/runtime/hydrate.js
function insertAfterAnchor(anchor, nodes) {
  let ref = anchor;
  for (const n of nodes) {
    ref.after(n);
    ref = n;
  }
}
function cloneAndHydrate(template, ctx) {
  const clone = template.content.cloneNode(true);
  const frag = document.createDocumentFragment();
  frag.append(clone);
  for (const child of [...frag.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "TEMPLATE") {
      if (child.hasAttribute("@if")) handleIfInline(frag, child, ctx);
      else if (child.hasAttribute("@for")) handleForInline(frag, child, ctx);
      else if (child.hasAttribute("@switch")) handleSwitch(child, ctx);
    } else {
      bindNode(child, ctx);
    }
  }
  return [...frag.childNodes];
}
function handleIf(children, idx, ctx) {
  const ifNode = children[idx];
  const expr = ifNode.getAttribute("@if");
  let elseNode = null;
  const next = ifNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@else")) {
    elseNode = next;
    elseNode.remove();
  }
  const anchor = document.createComment("@if");
  ifNode.replaceWith(anchor);
  let rendered = [];
  effect(() => {
    for (const n of rendered) n.remove();
    const source = evaluate(expr, ctx) ? ifNode : elseNode;
    rendered = source ? cloneAndHydrate(source, ctx) : [];
    insertAfterAnchor(anchor, rendered);
  });
  return idx + 1;
}
function handleIfInline(parent, ifNode, ctx) {
  const expr = ifNode.getAttribute("@if");
  let elseNode = null;
  const next = ifNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@else")) {
    elseNode = next;
    elseNode.remove();
  }
  const anchor = document.createComment("@if");
  ifNode.replaceWith(anchor);
  let rendered = [];
  effect(() => {
    for (const n of rendered) n.remove();
    const source = evaluate(expr, ctx) ? ifNode : elseNode;
    rendered = source ? cloneAndHydrate(source, ctx) : [];
    insertAfterAnchor(anchor, rendered);
  });
}
function handleFor(children, idx, ctx) {
  const forNode = children[idx];
  const expr = forNode.getAttribute("@for");
  let emptyNode = null;
  const next = forNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@empty")) {
    emptyNode = next;
    emptyNode.remove();
  }
  const match = expr.match(/(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+))?$/);
  if (!match) return idx + 1;
  const [, itemName, listExpr] = match;
  const anchor = document.createComment("@for");
  forNode.replaceWith(anchor);
  let rendered = [];
  effect(() => {
    for (const n of rendered) n.remove();
    rendered = [];
    const list = evaluate(listExpr, ctx) ?? [];
    if (list.length === 0 && emptyNode) {
      rendered = cloneAndHydrate(emptyNode, ctx);
      insertAfterAnchor(anchor, rendered);
      return;
    }
    let ref = anchor;
    for (let i = 0; i < list.length; i++) {
      const itemCtx = { ...ctx, [itemName]: list[i], $index: i, $first: i === 0, $last: i === list.length - 1, $even: i % 2 === 0, $odd: i % 2 !== 0 };
      const nodes = cloneAndHydrate(forNode, itemCtx);
      for (const n of nodes) {
        ref.after(n);
        ref = n;
      }
      rendered.push(...nodes);
    }
  });
  return idx + 1;
}
function handleForInline(parent, forNode, ctx) {
  const expr = forNode.getAttribute("@for");
  let emptyNode = null;
  const next = forNode.nextElementSibling;
  if (next?.tagName === "TEMPLATE" && next.hasAttribute("@empty")) {
    emptyNode = next;
    emptyNode.remove();
  }
  const match = expr.match(/(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+))?$/);
  if (!match) return;
  const [, itemName, listExpr] = match;
  const anchor = document.createComment("@for");
  forNode.replaceWith(anchor);
  let rendered = [];
  effect(() => {
    for (const n of rendered) n.remove();
    rendered = [];
    const list = evaluate(listExpr, ctx) ?? [];
    if (list.length === 0 && emptyNode) {
      rendered = cloneAndHydrate(emptyNode, ctx);
      insertAfterAnchor(anchor, rendered);
      return;
    }
    let ref = anchor;
    for (let i = 0; i < list.length; i++) {
      const itemCtx = { ...ctx, [itemName]: list[i], $index: i, $first: i === 0, $last: i === list.length - 1, $even: i % 2 === 0, $odd: i % 2 !== 0 };
      const nodes = cloneAndHydrate(forNode, itemCtx);
      for (const n of nodes) {
        ref.after(n);
        ref = n;
      }
      rendered.push(...nodes);
    }
  });
}
function handleSwitch(switchNode, ctx) {
  const expr = switchNode.getAttribute("@switch");
  const cases = [], children = switchNode.content.children;
  let defaultTpl = null;
  for (const child of children) {
    if (child.tagName === "TEMPLATE" && child.hasAttribute("@case"))
      cases.push({ value: child.getAttribute("@case"), template: child });
    else if (child.tagName === "TEMPLATE" && child.hasAttribute("@default"))
      defaultTpl = child;
  }
  const anchor = document.createComment("@switch");
  switchNode.replaceWith(anchor);
  let rendered = [];
  effect(() => {
    for (const n of rendered) n.remove();
    const value = evaluate(expr, ctx);
    const matched = cases.find((c) => evaluate(c.value, ctx) === value);
    const source = matched?.template ?? defaultTpl;
    rendered = source ? cloneAndHydrate(source, ctx) : [];
    insertAfterAnchor(anchor, rendered);
  });
}
function hydrateChildren(parent, ctx) {
  const children = [...parent.childNodes];
  let i = 0;
  while (i < children.length) {
    const node = children[i];
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "TEMPLATE") {
      if (node.hasAttribute("@if")) {
        i = handleIf(children, i, ctx);
      } else if (node.hasAttribute("@for")) {
        i = handleFor(children, i, ctx);
      } else if (node.hasAttribute("@switch")) {
        handleSwitch(node, ctx);
        i++;
      } else {
        i++;
      }
    } else {
      bindNode(node, ctx);
      i++;
    }
  }
}
function hydrate(root, ctx) {
  hydrateChildren(root, ctx);
}
export {
  computed,
  effect,
  hydrate,
  signal
};
