/**
 * Minimal tag/attribute scanner.
 *
 * Deliberately not a DOM parser. The validator's whole value is precise spans on
 * the author's original text, and a DOM parse throws away byte offsets, normalises
 * casing, and silently repairs malformed markup — which is exactly the input we are
 * here to complain about. Zero dependencies, matching the runtime's own constraint.
 *
 * Deliberately not regex-based either. This scanner reads UNTRUSTED input — model-
 * generated templates are the product — and the previous regexes were polynomial:
 * `((?:[^>"']|"[^"]*"|'[^']*')*)` backtracked across unbalanced quotes. Every loop
 * below advances an index and never revisits input, so cost is linear by
 * construction rather than by luck.
 */

import { findInterpolations } from '@basenative/runtime/shared/escape';

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
const isNameStart = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isNameChar = (c) => isNameStart(c) || (c >= '0' && c <= '9') || c === '_' || c === '-';

/** Convert a 0-based offset into 1-based line/col. */
export function spanAt(source, offset) {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, col: offset - lineStart + 1 };
}

/**
 * Find the end of the tag that opens at `start` (index of `<`), honouring quoted
 * attribute values so a `>` inside quotes does not terminate it. Returns the index
 * of the closing `>`, or -1 if the tag never closes.
 *
 * An unbalanced quote is treated as a plain character rather than the start of a
 * string that runs to end-of-input: that keeps the scan linear and means a stray
 * quote in one attribute cannot swallow the rest of the template.
 */
function findTagEnd(source, start) {
  let i = start;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    if (c === '>') return i;
    if (c === '"' || c === "'") {
      const close = source.indexOf(c, i + 1);
      // A quote with a matching close is a string and may contain `>`. A quote
      // with no close anywhere is a stray character, not a string that runs to
      // end of input.
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Parse attributes from `text` (the region between the tag name and `>`).
 * `base` is the absolute offset of `text[0]`, so attribute offsets are absolute.
 *
 * Attribute names must admit foreign syntax too — Angular's [prop] / (event) /
 * *ngFor and Vue's v-bind: all have to be recognised in order to be rejected. So a
 * name is any run of characters that is not whitespace, `=`, `<`, `>`, `/`, or a
 * quote.
 */
function parseAttrs(text, base) {
  const attrs = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    while (i < n && isSpace(text[i])) i++;
    if (i >= n) break;
    if (text[i] === '/') {
      i++;
      continue;
    }
    const nameStart = i;
    while (i < n && !isSpace(text[i]) && text[i] !== '=' && text[i] !== '"' && text[i] !== "'" && text[i] !== '/' && text[i] !== '<' && text[i] !== '>') {
      i++;
    }
    if (i === nameStart) {
      // Not a name character (e.g. a stray quote); skip it so we always advance.
      i++;
      continue;
    }
    const name = text.slice(nameStart, i);

    let value = null;
    let j = i;
    while (j < n && isSpace(text[j])) j++;
    if (j < n && text[j] === '=') {
      j++;
      while (j < n && isSpace(text[j])) j++;
      if (j < n && (text[j] === '"' || text[j] === "'")) {
        const q = text[j];
        const close = text.indexOf(q, j + 1);
        if (close !== -1) {
          value = text.slice(j + 1, close);
          j = close + 1;
        } else {
          // Unterminated quote: take the rest, but do not loop on it.
          value = text.slice(j + 1);
          j = n;
        }
      } else {
        const vStart = j;
        while (j < n && !isSpace(text[j]) && text[j] !== '>') j++;
        value = text.slice(vStart, j);
      }
      i = j;
    }
    attrs.push({ name, value, offset: base + nameStart });
  }
  return attrs;
}

/**
 * Yield every element open tag with its attributes and their offsets.
 * Close tags are reported too (`closing: true`) so branch adjacency can be checked.
 */
export function scanTags(source) {
  const tags = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const lt = source.indexOf('<', i);
    if (lt === -1) break;

    // Skip comments wholesale: markup inside `<!-- -->` is not rendered, so it is
    // not the validator's business either.
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }

    let p = lt + 1;
    const closing = source[p] === '/';
    if (closing) p++;

    // Only letters open a tag; `<!doctype`, `<3`, `< ` are text.
    if (p >= n || !isNameStart(source[p])) {
      i = lt + 1;
      continue;
    }
    const nameStart = p;
    while (p < n && isNameChar(source[p])) p++;
    const tagName = source.slice(nameStart, p).toLowerCase();

    const gt = findTagEnd(source, p);
    if (gt === -1) break;

    const raw = source.slice(lt, gt + 1);
    let attrs = [];
    if (!closing) {
      const attrText = source.slice(p, gt);
      attrs = parseAttrs(attrText, p);
    }

    tags.push({ tagName, closing, attrs, offset: lt, raw });
    i = gt + 1;
  }
  return tags;
}

/** Yield every `{{ ... }}` interpolation with its inner expression and offset. */
export function scanInterpolations(source) {
  // One interpolation scanner for the whole runtime: the same linear routine the
  // renderer and the client binder use, so the validator cannot disagree with them
  // about what counts as an interpolation.
  return findInterpolations(source).map(({ start, expression }) => ({ expression, offset: start }));
}
