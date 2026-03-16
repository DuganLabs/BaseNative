import { parse } from 'node-html-parser';

function evaluate(expr, ctx) {
  try {
    const keys = Object.keys(ctx);
    return new Function(...keys, `return(${expr})`)(...keys.map(k => ctx[k]));
  } catch { return undefined; }
}

function interpolate(text, ctx) {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const val = evaluate(expr, ctx);
    return val != null ? val : '';
  });
}

function processChildren(parent, ctx) {
  const children = parent.childNodes.slice();
  let i = 0;
  while (i < children.length) {
    const node = children[i];
    if (node.nodeType === 1 && node.rawTagName === 'template') {
      if (node.getAttribute('@if') != null) {
        i = processIf(parent, children, i, ctx);
      } else if (node.getAttribute('@for') != null) {
        i = processFor(parent, children, i, ctx);
      } else if (node.getAttribute('@switch') != null) {
        processSwitch(parent, node, ctx);
        i++;
      } else {
        i++;
      }
    } else {
      processNode(node, ctx);
      i++;
    }
  }
}

function processNode(node, ctx) {
  if (node.nodeType === 3) {
    const raw = node.rawText;
    if (raw.includes('{{')) {
      node.rawText = interpolate(raw, ctx);
    }
    return;
  }
  if (node.nodeType !== 1) return;

  const tag = node.rawTagName?.toLowerCase();
  if (tag === 'style') return;
  if (tag === 'script' && node.getAttribute('type') !== 'application/json') return;

  const attrs = node.rawAttrs;
  if (attrs) {
    const attrList = parseAttrs(attrs);
    const kept = [];
    for (const { name, value } of attrList) {
      if (name.startsWith('@')) {
        continue;
      } else if (name.startsWith(':')) {
        const attrName = name.slice(1);
        const result = evaluate(value, ctx);
        if (result !== false && result != null) {
          kept.push({ name: attrName, value: String(result) });
        }
      } else if (value && value.includes('{{')) {
        kept.push({ name, value: interpolate(value, ctx) });
      } else {
        kept.push({ name, value });
      }
    }
    node.rawAttrs = kept.map(a => a.value !== '' ? `${a.name}="${a.value}"` : a.name).join(' ');
  }

  processChildren(node, ctx);
}

function processIf(parent, children, idx, ctx) {
  const ifNode = children[idx];
  const expr = ifNode.getAttribute('@if');
  let elseNode = null;
  const next = findNextElementSibling(children, idx + 1);
  if (next?.rawTagName === 'template' && next.getAttribute('@else') != null) {
    elseNode = next;
  }

  const condition = evaluate(expr, ctx);
  const source = condition ? ifNode : elseNode;

  if (source) {
    const content = parse(source.innerHTML);
    processChildren(content, ctx);
    ifNode.replaceWith(content);
  } else {
    ifNode.remove();
  }

  if (elseNode && elseNode !== ifNode) {
    elseNode.remove();
  }

  return idx + 1;
}

function processFor(parent, children, idx, ctx) {
  const forNode = children[idx];
  const expr = forNode.getAttribute('@for');
  let emptyNode = null;
  const nextEl = findNextElementSibling(children, idx + 1);
  if (nextEl?.rawTagName === 'template' && nextEl.getAttribute('@empty') != null) {
    emptyNode = nextEl;
  }

  const match = expr.match(/(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+))?$/);
  if (!match) return idx + 1;

  const [, itemName, listExpr] = match;
  const list = evaluate(listExpr, ctx) ?? [];

  if (list.length === 0 && emptyNode) {
    const content = parse(emptyNode.innerHTML);
    processChildren(content, ctx);
    forNode.replaceWith(content);
    emptyNode.remove();
    return idx + 1;
  }

  const fragments = [];
  for (let i = 0; i < list.length; i++) {
    const itemCtx = {
      ...ctx,
      [itemName]: list[i],
      $index: i,
      $first: i === 0,
      $last: i === list.length - 1,
      $even: i % 2 === 0,
      $odd: i % 2 !== 0,
    };
    const content = parse(forNode.innerHTML);
    processChildren(content, itemCtx);
    fragments.push(content.toString());
  }

  const result = parse(fragments.join(''));
  forNode.replaceWith(result);

  if (emptyNode) emptyNode.remove();
  return idx + 1;
}

function processSwitch(parent, switchNode, ctx) {
  const expr = switchNode.getAttribute('@switch');
  const value = evaluate(expr, ctx);
  const templateChildren = switchNode.childNodes.filter(
    n => n.nodeType === 1 && n.rawTagName === 'template'
  );
  let matched = null;
  let defaultTpl = null;
  for (const child of templateChildren) {
    if (child.getAttribute('@case') != null) {
      const caseVal = evaluate(child.getAttribute('@case'), ctx);
      if (caseVal === value && !matched) matched = child;
    } else if (child.getAttribute('@default') != null) {
      defaultTpl = child;
    }
  }
  const source = matched ?? defaultTpl;
  if (source) {
    const content = parse(source.innerHTML);
    processChildren(content, ctx);
    switchNode.replaceWith(content);
  } else {
    switchNode.remove();
  }
}

function findNextElementSibling(children, startIdx) {
  for (let i = startIdx; i < children.length; i++) {
    if (children[i].nodeType === 1) return children[i];
  }
  return null;
}

function parseAttrs(rawAttrs) {
  const attrs = [];
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m;
  while ((m = re.exec(rawAttrs)) !== null) {
    attrs.push({ name: m[1], value: m[2] ?? m[3] ?? m[4] ?? '' });
  }
  return attrs;
}

export function render(html, ctx = {}) {
  const root = parse(html, { comment: true });
  processChildren(root, ctx);
  return root.toString();
}
