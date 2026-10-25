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
 * --color-syntax-* tokens (.kw .str .fn .num .cmt .tag .attr .var) and
 * the spans match the hand-written ones they replace.
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

/**
 * The CTI+ role vocabularies, derived from the migrated token set
 * itself: the DTCG source in @basenative/components/tokens is the
 * authority, so the segmenter learns its categories, types and states
 * from the tokens' recorded taxonomy instead of keeping a second,
 * hand-maintained copy here. If the token source is not beside this
 * module, segmentation falls back to name shape alone.
 */
import { readFileSync, readdirSync } from 'node:fs';

function loadTokenVocabulary() {
  const categories = new Set();
  const types = new Set();
  const states = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir));
      else if (entry.name.endsWith('.json')) {
        const tree = JSON.parse(readFileSync(new URL(entry.name, dir), 'utf8'));
        for (const leaf of Object.values(tree)) {
          const taxonomy = leaf?.$extensions?.['com.basenative']?.taxonomy;
          if (!taxonomy) continue;
          if (taxonomy.category) categories.add(taxonomy.category);
          if (taxonomy.type) types.add(taxonomy.type);
          if (taxonomy.state) states.add(taxonomy.state);
        }
      }
    }
  };
  try {
    walk(new URL('../../packages/components/tokens/', import.meta.url));
  } catch {
    // No token source available: roles degrade to category + middle.
  }
  return { categories, types, states };
}

const TOKEN_VOCAB = loadTokenVocabulary();

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
 * Is this sample CSS rather than JS/HTML? Stylesheets reach the same
 * pass (component Source panes show .css files whole), and CSS through
 * the JS scanner comes out flat — var( even lands as a keyword. The
 * signals are conservative and one-way: a custom-property definition or
 * an at-rule or a selector block in a sample with no JS statement
 * starters. A JS file that merely mentions CSS (an embedded template
 * string, an object literal) keeps the JS scanner.
 */
export function looksLikeCss(code) {
  if (/(^|\n)\s*(import\s|export\s|const\s|let\s|var\s|function\s|class\s)/.test(code)) return false;
  if (/(^|[\n{;])\s*--[\w-]+\s*:/.test(code)) return true;
  if (/(^|\n)\s*@(media|supports|keyframes|font-face|import|layer)\b/.test(code)) return true;
  return /(^|\n)\s*[.#:&*\w][^{}=();]*\{[^{]*[-\w]+\s*:/.test(code);
}

/**
 * Tokenize CSS into the same syntax classes. A small mode machine —
 * selector, property, value — over a brace stack, so nested rules
 * (&:hover { … }) parse as selectors inside blocks, and a declaration's
 * property is told from a pseudo-class by what terminates the run.
 * Class mapping: elements/classes/pseudos' hosts → tag, property names
 * → attr, pseudo-classes and at-rules → kw, functions → fn, numbers
 * with units and hex colours → num. Custom properties get their own
 * class (var) and CTI+ segmentation, in definitions, in var()
 * references, and in class selectors alike: the name is split on its
 * hyphens and each dynamic role takes its own class — the category
 * takes the base class, a type takes attr, the item/variant middle
 * takes fn, a state/context tail takes kw, and a numeric tail (a
 * palette weight, a scale step) takes num — so
 * --color-bkg-button-primary-hover and --palette-primary-400 read as
 * their taxonomy, not as one long name. The role vocabularies come
 * from the DTCG token source (see TOKEN_VOCAB above).
 */
export function tokenizeCss(code) {
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
  let depth = 0;
  let mode = 'selector'; // 'selector' | 'prop' | 'value'
  let paren = 0;
  let inPrelude = false; // after an at-rule, before its '{' or ';'

  const readName = (from) => {
    let j = from;
    while (j < n && /[-\w]/.test(code[j])) j += 1;
    return j;
  };
  // Split a name into its CTI+ dynamics: category, an optional type,
  // the item/variant middle, and an optional state/context tail (a
  // numeric tail is its own role). Segments are matched against the
  // vocabularies derived from the token source; an unknown head still
  // takes the category role, so unfamiliar names segment gracefully.
  // The parts' texts, joined by the hyphens the caller re-adds, always
  // reproduce the name byte for byte.
  const segmentName = (name) => {
    const segs = name.split('-');
    const parts = [];
    let i = 0;
    let catLen = 1;
    for (let len = Math.min(segs.length, 4); len > 1; len -= 1) {
      if (TOKEN_VOCAB.categories.has(segs.slice(0, len).join('-'))) {
        catLen = len;
        break;
      }
    }
    parts.push({ text: segs.slice(0, catLen).join('-'), role: 'category' });
    i = catLen;
    if (i < segs.length && TOKEN_VOCAB.types.has(segs[i])) {
      parts.push({ text: segs[i], role: 'type' });
      i += 1;
    }
    let tail = null;
    const remaining = segs.length - i;
    if (remaining >= 1) {
      const last = segs[segs.length - 1];
      if (/^\d+$/.test(last)) tail = { text: last, role: 'number' };
      else if (remaining >= 2 && TOKEN_VOCAB.states.has(last)) tail = { text: last, role: 'state' };
    }
    const midEnd = tail ? segs.length - 1 : segs.length;
    if (midEnd > i) parts.push({ text: segs.slice(i, midEnd).join('-'), role: 'middle' });
    if (tail) parts.push(tail);
    return parts;
  };
  const ROLE_CLASS = { type: 'attr', middle: 'fn', state: 'kw', number: 'num' };
  // Push a name in role segments: the category in baseCls, each later
  // segment hyphen-prefixed in its role's class. `name` excludes its
  // prefix ('--' or '.'); the caller pushes the first segment with the
  // prefix attached.
  const pushSegmented = (name, prefix, baseCls) => {
    segmentName(name).forEach((part, index) => {
      const cls = part.role === 'category' ? baseCls : ROLE_CLASS[part.role];
      push(cls, (index === 0 ? prefix : '-') + part.text);
    });
  };
  const pushCustomProperty = (name) => pushSegmented(name.slice(2), '--', 'var');
  const readNumber = (from) => {
    let j = from;
    if (code[j] === '-' || code[j] === '+') j += 1;
    while (j < n && /[0-9_]/.test(code[j])) j += 1;
    if (code[j] === '.' && isDigit(code[j + 1] || '')) {
      j += 1;
      while (j < n && /[0-9]/.test(code[j])) j += 1;
    }
    while (j < n && /[a-zA-Z%]/.test(code[j])) j += 1;
    return j;
  };
  const nextTerminator = (from) => {
    let p = 0;
    for (let j = from; j < n; j += 1) {
      const c = code[j];
      if (c === '(') p += 1;
      else if (c === ')') p -= 1;
      else if (p === 0 && (c === '{' || c === ';' || c === '}')) return c;
    }
    return '';
  };

  while (i < n) {
    const ch = code[i];
    const next = code[i + 1] || '';

    if (ch === '/' && next === '*') {
      let j = code.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      push('cmt', code.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '/' && next === '/' && mode !== 'value') {
      let j = code.indexOf('\n', i);
      if (j === -1) j = n;
      push('cmt', code.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && code[j] !== ch) {
        if (code[j] === '\\') j += 1;
        j += 1;
      }
      if (j < n) j += 1;
      push('str', code.slice(i, j));
      i = j;
      continue;
    }

    if (mode === 'selector') {
      if (ch === '{') {
        push(null, ch);
        depth += 1;
        mode = 'prop';
        paren = 0;
        inPrelude = false;
        i += 1;
        continue;
      }
      if (ch === '}') {
        push(null, ch);
        depth = Math.max(0, depth - 1);
        mode = depth > 0 ? 'prop' : 'selector';
        i += 1;
        continue;
      }
      if (ch === ';') {
        push(null, ch);
        inPrelude = false;
        i += 1;
        continue;
      }
      if (ch === '@' && /[A-Za-z-]/.test(next)) {
        const j = readName(i + 1);
        push('kw', code.slice(i, j));
        inPrelude = true;
        i = j;
        continue;
      }
      if (inPrelude) {
        if (isDigit(ch)) {
          const j = readNumber(i);
          push('num', code.slice(i, j));
          i = j;
          continue;
        }
        push(null, ch);
        i += 1;
        continue;
      }
      if (ch === '.' || ch === '#') {
        const j = readName(i + 1);
        if (j > i + 1) {
          if (ch === '.') pushSegmented(code.slice(i + 1, j), '.', 'tag');
          else push('tag', code.slice(i, j));
          i = j;
          continue;
        }
      }
      if (ch === '&' || ch === '*') {
        push('tag', ch);
        i += 1;
        continue;
      }
      if (ch === ':') {
        let j = i;
        while (j < n && code[j] === ':') j += 1;
        push(null, code.slice(i, j));
        const k = readName(j);
        if (k > j) push('kw', code.slice(j, k));
        i = k;
        continue;
      }
      if (ch === '[') {
        push(null, ch);
        i += 1;
        // Attribute name inside the brackets.
        let j = i;
        while (j < n && /\s/.test(code[j])) j += 1;
        const k = readName(j);
        if (k > j) {
          if (j > i) push(null, code.slice(i, j));
          push('attr', code.slice(j, k));
          i = k;
        }
        continue;
      }
      if (isDigit(ch)) {
        const j = readNumber(i);
        push('num', code.slice(i, j));
        i = j;
        continue;
      }
      if (/[A-Za-z-]/.test(ch)) {
        const j = readName(i);
        push('tag', code.slice(i, j));
        i = j;
        continue;
      }
      push(null, ch);
      i += 1;
      continue;
    }

    if (mode === 'prop') {
      if (ch === '}') {
        push(null, ch);
        depth = Math.max(0, depth - 1);
        mode = depth > 0 ? 'prop' : 'selector';
        i += 1;
        continue;
      }
      if (/[A-Za-z-]/.test(ch)) {
        const j = readName(i);
        const name = code.slice(i, j);
        let k = j;
        while (k < n && /\s/.test(code[k])) k += 1;
        if (code[k] === ':' && (name.startsWith('--') || nextTerminator(k + 1) !== '{')) {
          if (name.startsWith('--')) pushCustomProperty(name);
          else push('attr', name);
          if (k > j) push(null, code.slice(j, k));
          push(null, ':');
          mode = 'value';
          paren = 0;
          i = k + 1;
          continue;
        }
        if (code[k] === ':' || code[k] === '{') {
          // A nested selector that starts with an element name
          // (a:hover {, li {): re-enter selector mode at this token.
          mode = 'selector';
          continue;
        }
        push('attr', name);
        i = j;
        continue;
      }
      if (ch === '&' || ch === '.' || ch === '#' || ch === ':' || ch === '[' || ch === '*') {
        mode = 'selector';
        continue;
      }
      push(null, ch);
      i += 1;
      continue;
    }

    // mode === 'value'
    if (ch === '(') {
      paren += 1;
      push(null, ch);
      i += 1;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      push(null, ch);
      i += 1;
      continue;
    }
    if (ch === ';' && paren === 0) {
      push(null, ch);
      mode = 'prop';
      i += 1;
      continue;
    }
    if (ch === '}' && paren === 0) {
      push(null, ch);
      depth = Math.max(0, depth - 1);
      mode = depth > 0 ? 'prop' : 'selector';
      i += 1;
      continue;
    }
    if (ch === '#') {
      let j = i + 1;
      while (j < n && /[0-9a-fA-F]/.test(code[j])) j += 1;
      if (j > i + 1) {
        push('num', code.slice(i, j));
        i = j;
        continue;
      }
      push(null, ch);
      i += 1;
      continue;
    }
    if (isDigit(ch) || ((ch === '-' || ch === '+') && isDigit(next)) || (ch === '.' && isDigit(next))) {
      const j = readNumber(i);
      push('num', code.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '!' ) {
      const j = readName(i + 1);
      if (code.slice(i + 1, j) === 'important') {
        push('kw', code.slice(i, j));
        i = j;
        continue;
      }
      push(null, ch);
      i += 1;
      continue;
    }
    if (/[A-Za-z-]/.test(ch)) {
      const j = readName(i);
      const word = code.slice(i, j);
      if (word.startsWith('--')) pushCustomProperty(word);
      else if (code[j] === '(') push('fn', word);
      else push(null, word);
      i = j;
      continue;
    }
    push(null, ch);
    i += 1;
  }
  flush();
  return tokens;
}

/**
 * Tokenize one code sample into { cls, text } pairs whose texts
 * concatenate back to the input exactly. cls is one of the styles.css
 * syntax classes or null for plain text.
 */
export function tokenize(code) {
  if (looksLikeCss(code)) return tokenizeCss(code);
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
