/**
 * Minimal tag/attribute scanner.
 *
 * Deliberately not a DOM parser. The validator's whole value is precise spans on
 * the author's original text, and a DOM parse throws away byte offsets, normalises
 * casing, and silently repairs malformed markup — which is exactly the input we are
 * here to complain about. Zero dependencies, matching the runtime's own constraint.
 */

const TAG_RE = /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
// Attribute names must admit foreign syntax too — Angular's [prop] / (event) /
// *ngFor and Vue's v-bind: all have to be *recognised* in order to be rejected.
const ATTR_RE = /([^\s=<>/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

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
 * Yield every element open tag with its attributes and their offsets.
 * Close tags are reported too (`closing: true`) so branch adjacency can be checked.
 */
export function scanTags(source) {
  const tags = [];
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(source)) !== null) {
    const [raw, tagName, attrText = ''] = m;
    const closing = raw.startsWith('</');
    const attrs = [];
    if (!closing && attrText.trim()) {
      const attrOffset = m.index + raw.indexOf(attrText);
      ATTR_RE.lastIndex = 0;
      let a;
      while ((a = ATTR_RE.exec(attrText)) !== null) {
        const name = a[1];
        if (!name || name === '/') continue;
        const value = a[2] ?? a[3] ?? a[4] ?? null;
        attrs.push({ name, value, offset: attrOffset + a.index });
      }
    }
    tags.push({
      tagName: tagName.toLowerCase(),
      closing,
      attrs,
      offset: m.index,
      raw,
    });
  }
  return tags;
}

/** Yield every `{{ ... }}` interpolation with its inner expression and offset. */
export function scanInterpolations(source) {
  const out = [];
  const re = /\{\{\s*(.+?)\s*\}\}/gs;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ expression: m[1], offset: m.index });
  }
  return out;
}
