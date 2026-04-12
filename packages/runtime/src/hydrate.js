import { effect } from './signals.js';
import { evaluate } from './evaluate.js';
import { bindNode } from './bind.js';
import { createLoopContext, updateLoopContext, createChildContext } from './scope.js';
import {
  disposeNodeTree,
  removeNodeRange,
  removeNodeTree,
  registerCleanup,
} from './dom-lifecycle.js';
import { createRuntimeOptions, emitDiagnostic, reportHydrationMismatch } from './diagnostics.js';

function insertAfterAnchor(anchor, nodes) {
  let ref = anchor;
  for (const node of nodes) {
    ref.after(node);
    ref = node;
  }
}

function removeRenderedNodes(nodes) {
  for (const node of nodes) {
    removeNodeTree(node);
  }
}

function cloneAndHydrate(template, ctx, options) {
  const fragment = template.content.cloneNode(true);
  hydrateChildren(fragment, ctx, options);
  return [...fragment.childNodes];
}

function createBlock(template, ctx, options, label = '@for:item') {
  const fragment = document.createDocumentFragment();
  const start = document.createComment(label);
  const end = document.createComment(`${label}:end`);
  const nodes = cloneAndHydrate(template, ctx, options);
  fragment.append(start);
  for (const node of nodes) fragment.append(node);
  fragment.append(end);
  return { start, end, fragment, ctx };
}

function extractBlockRange(block) {
  const fragment = document.createDocumentFragment();
  let node = block.start;
  while (node) {
    const current = node;
    node = node.nextSibling;
    fragment.append(current);
    if (current === block.end) break;
  }
  return fragment;
}

function mountBlockAfter(cursor, block) {
  if (!block.fragment && block.start.previousSibling === cursor) return;
  const fragment = block.fragment ?? extractBlockRange(block);
  block.fragment = null;
  cursor.after(fragment);
}

function removeBlock(block) {
  if (!block) return;

  if (block.fragment) {
    let node = block.start;
    while (node) {
      const current = node;
      node = node.nextSibling;
      removeNodeTree(current);
      if (current === block.end) break;
    }
    block.fragment = null;
    return;
  }

  removeNodeRange(block.start, block.end);
}

function parseForExpression(expr, options) {
  const match = expr.match(/(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+))?$/);
  if (match) {
    return {
      itemName: match[1],
      listExpr: match[2],
      trackExpr: match[3]?.trim() || null,
    };
  }

  emitDiagnostic(options, {
    level: 'error',
    domain: 'template',
    code: 'BN_FOR_INVALID_SYNTAX',
    message: `Invalid @for expression "${expr}"`,
    expression: expr,
  });
  return null;
}

function createLoopEvalContext(ctx, itemName, item, index, length) {
  return createChildContext(ctx, {
    [itemName]: item,
    $index: index,
    $first: index === 0,
    $last: index === length - 1,
    $even: index % 2 === 0,
    $odd: index % 2 !== 0,
  });
}

function renderEmptyBlock(state, anchor, emptyNode, ctx, options) {
  if (state.emptyBlock || !emptyNode) return;
  state.emptyBlock = createBlock(emptyNode, ctx, options, '@empty');
  mountBlockAfter(anchor, state.emptyBlock);
}

function clearEmptyBlock(state) {
  if (!state.emptyBlock) return;
  removeBlock(state.emptyBlock);
  state.emptyBlock = null;
}

function clearForState(state) {
  clearEmptyBlock(state);
  removeRenderedNodes(state.rendered);
  state.rendered = [];
  for (const block of state.blocks) removeBlock(block);
  state.blocks = [];
  state.blocksByKey.clear();
}

function renderUntrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list) {
  for (const block of state.blocks) removeBlock(block);
  state.blocks = [];
  state.blocksByKey.clear();

  removeRenderedNodes(state.rendered);
  state.rendered = [];
  clearEmptyBlock(state);

  if (list.length === 0) {
    renderEmptyBlock(state, anchor, emptyNode, ctx, options);
    return;
  }

  let cursor = anchor;
  for (let index = 0; index < list.length; index++) {
    const itemCtx = createLoopEvalContext(ctx, itemName, list[index], index, list.length);
    const nodes = cloneAndHydrate(template, itemCtx, options);
    insertAfterAnchor(cursor, nodes);
    cursor = nodes[nodes.length - 1] ?? cursor;
    state.rendered.push(...nodes);
  }
}

function reconcileTrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list, trackExpr) {
  removeRenderedNodes(state.rendered);
  state.rendered = [];
  clearEmptyBlock(state);

  if (list.length === 0) {
    for (const block of state.blocks) removeBlock(block);
    state.blocks = [];
    state.blocksByKey.clear();
    renderEmptyBlock(state, anchor, emptyNode, ctx, options);
    return;
  }

  const previousBlocks = new Map(state.blocksByKey);
  const nextBlocks = [];
  const seenKeys = new Set();

  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    const evalCtx = createLoopEvalContext(ctx, itemName, item, index, list.length);
    const key = evaluate(trackExpr, evalCtx, options);

    if (seenKeys.has(key)) {
      emitDiagnostic(options, {
        level: 'error',
        domain: 'template',
        code: 'BN_FOR_DUPLICATE_TRACK_KEY',
        message: `Duplicate @for track key "${String(key)}" detected; falling back to unkeyed rendering for this update`,
        expression: trackExpr,
        key,
      });
      clearForState(state);
      renderUntrackedList(state, anchor, template, emptyNode, ctx, options, itemName, list);
      return;
    }

    seenKeys.add(key);
    let block = previousBlocks.get(key);
    if (block) {
      previousBlocks.delete(key);
      updateLoopContext(block.slots, itemName, item, index, list.length);
    } else {
      const loopState = createLoopContext(ctx, itemName, item, index, list.length);
      block = createBlock(template, loopState.ctx, options);
      block.slots = loopState.slots;
      block.key = key;
    }

    nextBlocks.push(block);
  }

  for (const block of previousBlocks.values()) removeBlock(block);

  let cursor = anchor;
  for (const block of nextBlocks) {
    mountBlockAfter(cursor, block);
    cursor = block.end;
  }

  state.blocks = nextBlocks;
  state.blocksByKey = new Map(nextBlocks.map(block => [block.key, block]));
}

function mountIfTemplate(templateNode, ctx, options) {
  const expr = templateNode.getAttribute('@if');
  let elseNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === 'TEMPLATE' && next.hasAttribute('@else')) {
    elseNode = next;
    elseNode.remove();
  }

  const anchor = document.createComment('@if');
  templateNode.replaceWith(anchor);
  let rendered = [];

  const runner = effect(() => {
    removeRenderedNodes(rendered);
    const source = evaluate(expr, ctx, options) ? templateNode : elseNode;
    rendered = source ? cloneAndHydrate(source, ctx, options) : [];
    insertAfterAnchor(anchor, rendered);
  });

  registerCleanup(anchor, () => {
    runner.dispose?.();
    removeRenderedNodes(rendered);
    rendered = [];
  });
}

function mountForTemplate(templateNode, ctx, options) {
  const parsed = parseForExpression(templateNode.getAttribute('@for'), options);
  let emptyNode = null;
  const next = templateNode.nextElementSibling;
  if (next?.tagName === 'TEMPLATE' && next.hasAttribute('@empty')) {
    emptyNode = next;
    emptyNode.remove();
  }

  const anchor = document.createComment('@for');
  templateNode.replaceWith(anchor);
  if (!parsed) return;

  const state = {
    blocks: [],
    blocksByKey: new Map(),
    emptyBlock: null,
    rendered: [],
  };

  const runner = effect(() => {
    const list = evaluate(parsed.listExpr, ctx, options) ?? [];
    if (!Array.isArray(list)) {
      emitDiagnostic(options, {
        level: 'warn',
        domain: 'template',
        code: 'BN_FOR_NON_ARRAY',
        message: `@for expected an array but received ${typeof list}; rendering nothing`,
        expression: parsed.listExpr,
      });
      clearForState(state);
      renderEmptyBlock(state, anchor, emptyNode, ctx, options);
      return;
    }

    if (parsed.trackExpr) {
      reconcileTrackedList(
        state,
        anchor,
        templateNode,
        emptyNode,
        ctx,
        options,
        parsed.itemName,
        list,
        parsed.trackExpr
      );
      return;
    }

    renderUntrackedList(state, anchor, templateNode, emptyNode, ctx, options, parsed.itemName, list);
  });

  registerCleanup(anchor, () => {
    runner.dispose?.();
    clearForState(state);
  });
}

function mountSwitchTemplate(templateNode, ctx, options) {
  const expr = templateNode.getAttribute('@switch');
  const cases = [];
  let defaultTemplate = null;

  for (const child of templateNode.content.children) {
    if (child.tagName !== 'TEMPLATE') continue;
    if (child.hasAttribute('@case')) {
      cases.push({
        value: child.getAttribute('@case'),
        template: child,
      });
    } else if (child.hasAttribute('@default')) {
      defaultTemplate = child;
    }
  }

  const anchor = document.createComment('@switch');
  templateNode.replaceWith(anchor);
  let rendered = [];

  const runner = effect(() => {
    removeRenderedNodes(rendered);
    const value = evaluate(expr, ctx, options);
    const match = cases.find(entry => evaluate(entry.value, ctx, options) === value);
    const source = match?.template ?? defaultTemplate;
    rendered = source ? cloneAndHydrate(source, ctx, options) : [];
    insertAfterAnchor(anchor, rendered);
  });

  registerCleanup(anchor, () => {
    runner.dispose?.();
    removeRenderedNodes(rendered);
    rendered = [];
  });
}

function hasHydrationMarkers(root) {
  const SHOW_COMMENT = globalThis.NodeFilter?.SHOW_COMMENT ?? 128;
  const walker = document.createTreeWalker(root, SHOW_COMMENT);
  while (walker.nextNode()) {
    if (String(walker.currentNode.nodeValue).startsWith('bn:')) return true;
  }
  return false;
}

export function hydrateChildren(parent, ctx, options = {}) {
  const children = [...parent.childNodes];
  let processed = 0;

  for (const node of children) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'TEMPLATE') {
      if (node.hasAttribute('@if')) {
        mountIfTemplate(node, ctx, options);
        processed++;
      } else if (node.hasAttribute('@for')) {
        mountForTemplate(node, ctx, options);
        processed++;
      } else if (node.hasAttribute('@switch')) {
        mountSwitchTemplate(node, ctx, options);
        processed++;
      }
      continue;
    }

    processed += bindNode(node, ctx, options);
  }

  return processed;
}

function hydrateDeferred(root, ctx, options) {
  const existing = root.querySelectorAll?.('[data-bn-defer]') ?? [];
  for (const el of existing) {
    if (el.children.length > 0) {
      hydrateChildren(el, ctx, options);
    }
  }

  if (typeof document === 'undefined') return () => {};

  function onDefer(event) {
    const id = event.detail?.id;
    if (!id) return;
    const target = root.querySelector?.(`[data-bn-defer-resolve="${id}"] ~ [data-bn-defer="${id}"]`) ??
                   root.querySelector?.(`div[data-bn-defer="${id}"]`);
    if (!target) return;
    hydrateChildren(target, ctx, options);
  }

  document.addEventListener('bn:defer', onDefer);
  return () => document.removeEventListener('bn:defer', onDefer);
}

export function hydrate(root, ctx, options = {}) {
  const runtimeOptions = createRuntimeOptions(options);
  const processed = hydrateChildren(root, ctx, runtimeOptions);
  const cleanupDeferred = hydrateDeferred(root, ctx, runtimeOptions);

  if (processed === 0) {
    const markerMessage = hasHydrationMarkers(root)
      ? 'hydrate() found server render markers but no template source; this build can diagnose SSR boundaries, but it still recovers by client-side template hydration only'
      : 'hydrate() found no BaseNative template directives in the target root';

    reportHydrationMismatch(runtimeOptions, markerMessage, {
      code: hasHydrationMarkers(root)
        ? 'BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE'
        : 'BN_HYDRATE_NO_DIRECTIVES',
    });
  }

  return () => {
    cleanupDeferred();
    disposeNodeTree(root);
  };
}
