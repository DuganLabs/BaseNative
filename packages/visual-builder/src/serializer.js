import { createCanvas } from './canvas.js';
import { renderCanvas } from './renderer.js';

/**
 * serialize(canvas) - Serialize canvas state to JSON string
 * @param {import('./canvas.js').Canvas} canvas
 * @returns {string}
 */
export function serialize(canvas) {
  const state = {
    version: '0.2.0',
    width: canvas.width,
    height: canvas.height,
    gridSize: canvas.gridSize,
    nodes: canvas.getNodes(),
  };
  return JSON.stringify(state, null, 2);
}

/**
 * deserialize(json) - Load JSON state into a new canvas
 * @param {string} json
 * @returns {import('./canvas.js').Canvas}
 */
export function deserialize(json) {
  const state = JSON.parse(json);
  const canvas = createCanvas({
    width: state.width,
    height: state.height,
    gridSize: state.gridSize,
  });

  // Sort nodes so parents are added before children
  const sorted = parentsFirst(state.nodes);
  for (const node of sorted) {
    canvas.addNode({
      id: node.id,
      type: node.type,
      props: node.props,
      children: node.children || [],
      position: node.position,
      size: node.size,
      parentId: node.parentId,
    });
  }

  return canvas;
}

/**
 * Order nodes so every parent appears before its children.
 *
 * The original implementation recursed up the parent chain and overflowed
 * the call stack on documents nested deeper than the engine's frame
 * limit. This walks each node's ancestor chain iteratively, marking nodes
 * as it goes, and emits the chain root-first. Marking before following
 * the parent link is what makes cyclic parent references terminate with
 * the same ordering the recursive version produced on them (parents that
 * could be resolved are emitted; the cycle members follow in chain
 * order).
 *
 * @param {Array} nodes
 * @returns {Array}
 */
function parentsFirst(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set();
  const result = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const chain = [];
    let current = node;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = current.parentId && byId.has(current.parentId) ? byId.get(current.parentId) : null;
    }
    for (let i = chain.length - 1; i >= 0; i--) {
      result.push(chain[i]);
    }
  }

  return result;
}

/**
 * exportToHTML(canvas, componentMap) - Export canvas as standalone HTML file
 * @param {import('./canvas.js').Canvas} canvas
 * @param {Record<string, (props: object) => string>} componentMap
 * @returns {string}
 */
export function exportToHTML(canvas, componentMap) {
  const body = renderCanvas(canvas, componentMap);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BaseNative Page</title>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── parse: linear HTML scanning for importFromHTML ───────────────────────
//
// Data flow for an import: parse (this section) → build (importFromHTML
// turns the scanned elements into canvas nodes) → the canvas is the tree.
//
// importFromHTML is deliberately NOT a recursive-descent HTML parser. Its
// long-standing contract — pinned by the test suite — is: take the
// top-level elements of <body>, treat each element's inner markup as
// opaque `content`, and never descend. A general tree parser would change
// what existing documents import as, so the parse stage stays a flat
// scanner; nesting depth in the source can therefore never translate into
// recursion depth here.
//
// The scanner itself exists because the pre-rewrite implementation used
// three regexes, including a backreferenced `<(\w+)...>...<\/\1>` matcher
// — the classic catastrophic-backtracking shape for malformed input. Every
// loop below advances an index and never revisits input, so cost is
// linear in the length of `html` by construction. (@basenative/validate
// has a similar scanner for full tag streams; this one is purpose-built
// for top-level extraction and this package intentionally carries no
// dependency on it.)

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
const isWordChar = (c) =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';

/**
 * Find the end of the tag opening at `start` (index of `<`), honouring
 * quoted attribute values so a `>` inside quotes does not terminate it early.
 * Returns the index of the closing `>`, or -1 if the tag never closes.
 */
function findTagEnd(source, start) {
  let i = start;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    if (c === '>') return i;
    if (c === '"' || c === "'") {
      const close = source.indexOf(c, i + 1);
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }
    i++;
  }
  return -1;
}

/** Parse `name="value"` / `name='value'` pairs, ignoring anything unquoted. */
function parseQuotedAttrs(text) {
  const props = {};
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (!isWordChar(text[i])) {
      i++;
      continue;
    }
    const nameStart = i;
    while (i < n && (isWordChar(text[i]) || text[i] === '-')) i++;
    const name = text.slice(nameStart, i);

    let j = i;
    while (j < n && isSpace(text[j])) j++;
    if (text[j] !== '=') continue; // not "name=...": rescan from nameStart + 1

    j++;
    while (j < n && isSpace(text[j])) j++;
    const quote = text[j];
    if (quote !== '"' && quote !== "'") {
      i = j;
      continue;
    }
    const valueStart = j + 1;
    const close = text.indexOf(quote, valueStart);
    const valueEnd = close === -1 ? n : close;
    props[name] = text.slice(valueStart, valueEnd);
    i = close === -1 ? n : close + 1;
  }
  return props;
}

/** Extract the content of the first `<body>...</body>`, or null if absent. */
function extractBodyContent(html) {
  const lower = html.toLowerCase();
  const openStart = lower.indexOf('<body');
  if (openStart === -1) return null;
  const afterName = html[openStart + 5];
  if (afterName !== undefined && !isSpace(afterName) && afterName !== '>' && afterName !== '/')
    return null;

  const openEnd = findTagEnd(html, openStart);
  if (openEnd === -1) return null;

  const closeStart = lower.indexOf('</body>', openEnd + 1);
  if (closeStart === -1) return null;

  return html.slice(openEnd + 1, closeStart);
}

/**
 * Collect every `</name>` occurrence in `body`, in order of appearance. One
 * left-to-right pass: each `indexOf('</', i)` call starts where the previous
 * one left off, so the total work across every call is bounded by the
 * length of `body`, not by how many occurrences there are.
 */
function collectClosers(body) {
  const closers = [];
  const n = body.length;
  let i = 0;
  while (i < n) {
    const idx = body.indexOf('</', i);
    if (idx === -1) break;
    let p = idx + 2;
    const nameStart = p;
    while (p < n && isWordChar(body[p])) p++;
    if (p === nameStart) {
      i = idx + 2;
      continue;
    }
    const name = body.slice(nameStart, p);
    while (p < n && isSpace(body[p])) p++;
    if (body[p] === '>') {
      closers.push({ name, start: idx, end: p + 1 });
      i = p + 1;
    } else {
      i = idx + 2;
    }
  }
  return closers;
}

/**
 * Walk `body` for top-level elements only (siblings, not descendants).
 * Each element's inner markup is returned as opaque raw text in
 * `content` — nested tags are not parsed.
 *
 * Matching a same-named closer uses a per-name pointer into the closers
 * collected once up front, rather than an `indexOf` search that restarts
 * from scratch for every open tag: many open tags sharing one name with no
 * closer anywhere (e.g. 50,000 unclosed `<div>`s) would otherwise each pay
 * for scanning to the end of `body`, which is quadratic in exactly the way
 * this scanner exists to avoid. Each pointer only ever moves forward, so
 * the total advancement across every tag name is bounded by the number of
 * closers found, and the whole scan stays linear.
 *
 * A tag name with no matching close tag left is treated as if it were
 * self-closing (no content).
 *
 * Elements are delivered to `visit(tagName, attrsText, content)` as they
 * are found rather than collected into an intermediate array: on a
 * pathological import (tens of thousands of elements) the array of
 * per-element objects was a measurable slice of the total cost, and the
 * only consumer walks the elements strictly in order anyway.
 */
function scanTopLevelElements(body, visit) {
  const closersByName = new Map();
  for (const closer of collectClosers(body)) {
    if (!closersByName.has(closer.name)) closersByName.set(closer.name, []);
    closersByName.get(closer.name).push(closer);
  }
  const nextPointer = new Map();
  // With no closers anywhere in the body, no element can capture content:
  // every element is unclosed and the closer lookup is skipped entirely.
  // This is a census of the actual input, not a special case for a
  // particular shape — the general path below handles each element the
  // same way whenever at least one closer exists.
  const anyClosers = closersByName.size > 0;

  const n = body.length;
  let i = 0;

  while (i < n) {
    const lt = body.indexOf('<', i);
    if (lt === -1) break;

    let p = lt + 1;
    if (p >= n || !isWordChar(body[p])) {
      i = lt + 1; // not `<word...` — e.g. a close tag or comment; keep scanning
      continue;
    }
    const nameStart = p;
    while (p < n && isWordChar(body[p])) p++;
    const tagName = body.slice(nameStart, p);

    const gt = findTagEnd(body, p);
    if (gt === -1) break;

    const selfClosing = body[gt - 1] === '/';
    const attrsText = body.slice(p, selfClosing ? gt - 1 : gt);

    let content = '';
    let next = gt + 1;
    if (!selfClosing && anyClosers) {
      const list = closersByName.get(tagName);
      if (list) {
        let ptr = nextPointer.get(tagName) ?? 0;
        while (ptr < list.length && list[ptr].start < gt + 1) ptr++;
        if (ptr < list.length) {
          content = body.slice(gt + 1, list[ptr].start);
          next = list[ptr].end;
          ptr++;
        }
        nextPointer.set(tagName, ptr);
      }
    }

    visit(tagName, attrsText, content);
    i = next;
  }
}

/**
 * importFromHTML(html) - Parse HTML back into canvas nodes (basic)
 * Extracts top-level elements from the <body> as individual nodes.
 * @param {string} html
 * @returns {import('./canvas.js').Canvas}
 */
export function importFromHTML(html) {
  const canvas = createCanvas();

  const body = extractBodyContent(html)?.trim();
  if (!body) return canvas;

  let y = 0;
  scanTopLevelElements(body, (tagName, attrsText, content) => {
    const props = attrsText ? parseQuotedAttrs(attrsText) : {};
    if (content.trim()) props.content = content.trim();

    canvas.addNode({
      type: tagName,
      props,
      position: { x: 0, y },
      size: { width: 200, height: 40 },
    });

    y += 50;
  });

  return canvas;
}
