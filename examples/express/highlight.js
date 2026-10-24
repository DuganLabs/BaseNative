/**
 * One syntax-highlighting pass for every code block the site renders.
 *
 * Before this module, highlighting existed only where an author had
 * hand-typed highlight spans into a template — two views out of
 * the whole site, so /compare's side-by-side code, every component
 * Quick-start and Source pane, and the showcase rendered as plain
 * monochrome while /docs was coloured. The fix belongs in the render
 * pipeline, not in more hand-typed spans: page.js runs every view's
 * rendered HTML through highlightCodeBlocks(), so a code block is
 * highlighted because it is a code block, on every page, the same way.
 *
 * The classes are the ones styles.css already defines from the
 * --syntax-* tokens (.kw .str .fn .num .cmt .tag .attr) and the spans
 * match the hand-written ones they replace.
 *
 * Safety and determinism: the pass is a pure function of the rendered
 * HTML. It decodes the (already escaped) text inside <pre><code>,
 * tokenizes it with a hand-written scanner — no eval, no Function, the
 * same discipline as the runtime's expression parser — and re-escapes
 * every token. A block whose code carries real child markup (the
 * builder's export placeholder is the one case) is not code text and
 * is left exactly as rendered. The text content of every block is
 * preserved byte for byte, so copy-code and text-based checks see the
 * same code as before.
 */

const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function',
  'return', 'if', 'else', 'for', 'of', 'in', 'new', 'class', 'extends',
  'await', 'async', 'try', 'catch', 'finally', 'throw', 'typeof',
  'instanceof', 'switch', 'case', 'break', 'continue', 'do', 'while',
  'delete', 'void', 'yield', 'static', 'this', 'true', 'false', 'null',
  'undefined',
]);

const NAMED_ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

/** Decode HTML entities in one pass, so &amp;lt; decodes to &lt;, never <. */
export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

/** Escape text for HTML content. Quotes need no escaping outside attributes. */
export function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const isIdentStart = (ch) => /[A-Za-z_$]/.test(ch);
const isIdentPart = (ch) => /[\w$]/.test(ch);
const isDigit = (ch) => /[0-9]/.test(ch);

/**
 * Tokenize one code sample into { cls, text } pairs whose texts
 * concatenate back to the input exactly. cls is one of the styles.css
 * syntax classes or null for plain text.
 */
export function tokenize(code) {
  const tokens = [];
  let plain = '';
  const push = (cls, text) => {
    if (!text) return;
    if (cls === null) {
      plain += text;
      return;
    }
    if (plain) {
      tokens.push({ cls: null, text: plain });
      plain = '';
    }
    tokens.push({ cls, text });
  };
  const flush = () => {
    if (plain) {
      tokens.push({ cls: null, text: plain });
      plain = '';
    }
  };

  let i = 0;
  const n = code.length;
  // The last significant (non-space) character emitted, for telling a
  // method call (count.set() — .fn) from a keyword in statement position.
  let prevSignificant = '';

  const readString = (quote) => {
    let j = i + 1;
    while (j < n) {
      if (code[j] === '\\') {
        j += 2;
        continue;
      }
      if (code[j] === quote) {
        j += 1;
        break;
      }
      j += 1;
    }
    const text = code.slice(i, j);
    push('str', text);
    prevSignificant = quote;
    i = j;
  };

  const readTag = () => {
    // code[i] === '<' and the next char starts a tag.
    let j = i + 1;
    push(null, '<');
    if (code[j] === '/') {
      push(null, '/');
      j += 1;
    }
    let name = '';
    while (j < n && /[\w-]/.test(code[j])) {
      name += code[j];
      j += 1;
    }
    if (name) push('tag', name);
    // Attributes until '>' (or EOF).
    while (j < n && code[j] !== '>') {
      const ch = code[j];
      if (ch === '/' && code[j + 1] === '>') break;
      if (ch === '"' || ch === "'") {
        // Quoted attribute value.
        let k = j + 1;
        while (k < n && code[k] !== ch) k += 1;
        if (k < n) k += 1;
        push('str', code.slice(j, k));
        j = k;
        continue;
      }
      if (/[:@A-Za-z_]/.test(ch)) {
        let k = j;
        while (k < n && /[\w@:.-]/.test(code[k])) k += 1;
        if (k === j) {
          // Defensive: a start char the continue class rejects must
          // still advance, or the scan spins on this tag forever.
          push(null, ch);
          j += 1;
          continue;
        }
        push('attr', code.slice(j, k));
        j = k;
        continue;
      }
      push(null, ch);
      j += 1;
    }
    if (code[j] === '/' && code[j + 1] === '>') {
      push(null, '/>');
      j += 2;
    } else if (code[j] === '>') {
      push(null, '>');
      j += 1;
    }
    prevSignificant = '>';
    i = j;
  };

  while (i < n) {
    const ch = code[i];
    const next = code[i + 1] || '';

    if (ch === '/' && next === '/' && prevSignificant !== ':') {
      let j = code.indexOf('\n', i);
      if (j === -1) j = n;
      push('cmt', code.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '/' && next === '*') {
      let j = code.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      push('cmt', code.slice(i, j));
      prevSignificant = '/';
      i = j;
      continue;
    }
    if (ch === '<' && code.startsWith('<!--', i)) {
      let j = code.indexOf('-->', i + 4);
      j = j === -1 ? n : j + 3;
      push('cmt', code.slice(i, j));
      prevSignificant = '>';
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      readString(ch);
      continue;
    }
    if (ch === '<' && /[A-Za-z/!]/.test(next)) {
      readTag();
      continue;
    }
    if (isDigit(ch)) {
      let j = i;
      if (ch === '0' && (next === 'x' || next === 'X')) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F_]/.test(code[j])) j += 1;
      } else {
        while (j < n && /[\d_]/.test(code[j])) j += 1;
        if (code[j] === '.' && isDigit(code[j + 1] || '')) {
          j += 1;
          while (j < n && /[\d_]/.test(code[j])) j += 1;
        }
        if (code[j] === 'e' || code[j] === 'E') {
          let k = j + 1;
          if (code[k] === '+' || code[k] === '-') k += 1;
          if (isDigit(code[k] || '')) {
            while (k < n && isDigit(code[k])) k += 1;
            j = k;
          }
        }
      }
      push('num', code.slice(i, j));
      prevSignificant = '0';
      i = j;
      continue;
    }
    if (isIdentStart(ch)) {
      let j = i;
      while (j < n && isIdentPart(code[j])) j += 1;
      const word = code.slice(i, j);
      let k = j;
      while (k < n && (code[k] === ' ' || code[k] === '\t')) k += 1;
      if (prevSignificant !== '.' && KEYWORDS.has(word)) {
        push('kw', word);
      } else if (code[k] === '(') {
        push('fn', word);
      } else {
        push(null, word);
      }
      prevSignificant = word[word.length - 1];
      i = j;
      continue;
    }
    push(null, ch);
    if (!/\s/.test(ch)) prevSignificant = ch;
    i += 1;
  }
  flush();
  return tokens;
}

/** Highlight one code sample's text, returning HTML. */
export function highlightCode(code) {
  return tokenize(code)
    .map((token) =>
      token.cls
        ? // A span is the highlight itself here: it wraps one token of
          // code text in the sheet's syntax classes, nothing structural.
          `<span class="${token.cls}">${escapeText(token.text)}</span>`
        : escapeText(token.text),
    )
    .join('');
}

const CODE_BLOCK = /(<pre\b[^>]*>\s*<code\b[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/g;

/**
 * Highlight every <pre><code> block in a rendered page. Blocks whose
 * code contains real child markup are placeholders, not code text —
 * they pass through untouched, as does everything outside code blocks.
 */
export function highlightCodeBlocks(html) {
  return html.replace(CODE_BLOCK, (whole, open, inner, close) => {
    if (inner.includes('<')) return whole;
    return open + highlightCode(decodeEntities(inner)) + close;
  });
}
