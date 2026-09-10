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
  const sorted = topologicalSort(state.nodes);
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
 * Topological sort: parents before children
 * @param {Array} nodes
 * @returns {Array}
 */
function topologicalSort(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set();
  const result = [];

  function visit(node) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    if (node.parentId && byId.has(node.parentId)) {
      visit(byId.get(node.parentId));
    }
    result.push(node);
  }

  for (const node of nodes) {
    visit(node);
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

// ─── linear HTML scanning for importFromHTML ──────────────────────────────
//
// importFromHTML used to be three regexes: a `<body>...</body>` extractor, a
// `<(\w+)...>...<\/\1>` backreferenced top-level tag matcher, and a
// `name="value"` attribute matcher. The backreferenced one is the classic
// catastrophic-backtracking shape — for malformed or unbalanced input (an
// imported template is exactly the kind of untrusted, hand-edited input
// where that shows up) the engine can spend polynomial time retrying
// `[^>]*` / `[\s\S]*?` splits before concluding no match exists.
//
// @basenative/validate already has a linear tag/attribute scanner
// (packages/validate/src/scan.js) for exactly this reason, but it walks EVERY
// tag, nested included, and reports each one individually — whereas
// importFromHTML wants top-level siblings only, with each one's inner markup
// captured as opaque `content` (matching the original regex's non-recursive
// behavior). This package does not depend on @basenative/validate, and adding
// that dependency to pull in the shared scanner would touch the workspace
// lockfile, which is out of scope for this fix — so this is a small,
// purpose-built scanner rather than a shared one.
//
// Every loop below advances an index and never revisits input, so cost is
// linear in the length of `html` by construction.

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
const isWordChar = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';

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
  if (afterName !== undefined && !isSpace(afterName) && afterName !== '>' && afterName !== '/') return null;

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
 * Walk `body` for top-level elements only (siblings, not descendants), like
 * the original `<(\w+)...>...<\/\1>` regex did. Each element's inner markup
 * is returned as opaque raw text in `content` — nested tags are not parsed.
 *
 * Matching a same-named closer uses a per-name pointer into the closers
 * collected once up front, rather than an `indexOf` search that restarts
 * from scratch for every open tag: many open tags sharing one name with no
 * closer anywhere (e.g. 50,000 unclosed `<div>`s) would otherwise each pay
 * for scanning to the end of `body`, which is quadratic in exactly the way
 * this rewrite exists to avoid. Each pointer only ever moves forward, so
 * the total advancement across every tag name is bounded by the number of
 * closers found, and the whole scan stays linear.
 *
 * A tag name with no matching close tag left is treated as if it were
 * self-closing (no content).
 */
function scanTopLevelElements(body) {
  const elements = [];
  const closersByName = new Map();
  for (const closer of collectClosers(body)) {
    if (!closersByName.has(closer.name)) closersByName.set(closer.name, []);
    closersByName.get(closer.name).push(closer);
  }
  const nextPointer = new Map();

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
    if (!selfClosing) {
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

    elements.push({ tagName, attrsText, content });
    i = next;
  }

  return elements;
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
  for (const { tagName, attrsText, content } of scanTopLevelElements(body)) {
    const props = parseQuotedAttrs(attrsText);
    if (content.trim()) props.content = content.trim();

    canvas.addNode({
      type: tagName,
      props,
      position: { x: 0, y },
      size: { width: 200, height: 40 },
    });

    y += 50;
  }

  return canvas;
}
