/** One syntax-highlighting implementation for BaseNative code samples,
 * shared by both places code is read: the playground's editors (in the
 * browser) and the site's render pass (examples/express/highlight.js,
 * on the server). It used to exist twice — the playground's engine here
 * and a second, divergent scanner in the site pass (different classes,
 * different custom-property segmentation, colours pointing at pre-CTI+
 * token names). There is one now: this module. The playground is the
 * reference behaviour — token classes are the tk-* family the sheets
 * style from the --color-text-syntax-* tokens, and a CTI+ custom
 * property name is segmented by its dynamics (category, type, item,
 * state) with the vocabularies below.
 *
 * Pure string functions: no DOM, no eval — the same text in, the same
 * highlighted HTML out, on either side.
 */

/* ================= syntax highlighting ================= */
const COMMENT_OPEN = '<!' + '--';

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Tokenize with `re`; every gap between matches is escaped plain text,
   every match is classified into a span. Nothing reaches innerHTML raw. */
function highlightWith(re, src, classify) {
  let out = '';
  let last = 0;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(src)) !== null) {
    out += escHtml(src.slice(last, m.index));
    out += classify(m);
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  out += escHtml(src.slice(last));
  return out;
}

const MARK = {
  'tk-com': 'i',
  'tk-tag': 'strong',
  'tk-attr': 'abbr',
  'tk-dir': 'dfn',
  'tk-bind': 'samp',
  'tk-str': 'mark',
  'tk-kw': 'b',
  'tk-fn': 'em',
  'tk-num': 'data',
  'tk-interp': 'kbd',
  'tk-cp-category': 'b',
  'tk-cp-type': 'em',
  'tk-cp-item': 'cite',
  'tk-cp-state': 'small',
};

function span(cls, text) {
  const tag = MARK[cls] || 'span';
  return '<' + tag + '>' + escHtml(text) + '</' + tag + '>';
}

function hlTag(tok) {
  const m = tok.match(/^(<\/?)([a-zA-Z][\w-]*)/);
  if (!m) return escHtml(tok);
  let out = escHtml(m[1]) + span('tk-tag', m[2]);
  const rest = tok.slice(m[0].length);
  out += rest.replace(/([^\s=/>]+)=("[^"]*"|'[^']*')|([^\s=/>]+)/g, (mm, name, q, bare) => {
    if (q) {
      const cls =
        name.charAt(0) === '@' ? 'tk-dir' : name.charAt(0) === ':' ? 'tk-bind' : 'tk-attr';
      return span(cls, name) + '=' + span('tk-str', q);
    }
    return escHtml(bare);
  });
  return out;
}

/* HTML, with the languages it embeds: a <script> body is JS and a
   <style> body is CSS, highlighted by those scanners between the
   element's own (HTML-highlighted) tags. Before this, everything
   between tags was plain text, so a page sample's module script read
   as monochrome while its markup was coloured. */
function hlHTML(src) {
  const re =
    /(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)|(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)|<![-]-[\s\S]*?-->|{{[\s\S]*?}}|<\/?[a-zA-Z][^>]*>/g;
  return highlightWith(re, src, (m) => {
    if (m[1]) return hlTag(m[1]) + hlJS(m[2]) + hlTag(m[3]);
    if (m[4]) return hlTag(m[4]) + hlCSS(m[5]) + hlTag(m[6]);
    const tok = m[0];
    if (tok.indexOf(COMMENT_OPEN) === 0) return span('tk-com', tok);
    if (tok.indexOf('{{') === 0) return span('tk-interp', tok);
    return hlTag(tok);
  });
}

function hlJS(src) {
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(import|export|from|default|as|const|let|var|function|class|extends|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|of|new|delete|typeof|instanceof|void|await|async|yield|this|super|static|true|false|null|undefined|in|do|interface|type|enum|implements|readonly|public|private|protected|keyof|declare|namespace|satisfies|string|number|boolean|unknown|any|never)\b|\b(signal|computed|effect|batch|mount|hydrate|raw|registerDirective)\b|([A-Za-z_$][\w$]*)(?=\s*\()|\b(\d+(?:\.\d+)?)\b/g;
  return highlightWith(re, src, (m) => {
    if (m[1]) return span('tk-com', m[1]);
    if (m[2]) return span('tk-str', m[2]);
    if (m[3]) return span('tk-kw', m[3]);
    if (m[4]) return span('tk-dir', m[4]);
    if (m[5]) return span('tk-fn', m[5]);
    if (m[6]) return span('tk-num', m[6]);
    return escHtml(m[0]);
  });
}

/* --- CTI+ segmentation -------------------------------------------------
   A custom property name is segmented by its dynamics so the structure
   reads at a glance: Category, then Type, then the Item/Variant middle,
   then the State/Context tail (a registered state word, or a numeric
   weight). The vocabularies below are the taxonomy's — categories and
   types from the token grammar, states from the components' sheets.
   A name that does not fit (a user's own experiment) still segments
   positionally: first segment category, second type, tail state when
   it reads as one. Definitions and var() references go through the
   same path, so a token looks identical in both places. */
const CP_TYPES = new Set([
  'bkg',
  'text',
  'icon',
  'border',
  'family',
  'size',
  'weight',
  'leading',
  'spacing',
  'transform',
  'decoration',
  'style',
  'align',
  'justify',
  'wrap',
  'display',
  'width',
  'height',
  'radius',
  'flex',
  'gap',
  'margin',
  'padding',
  'min-width',
  'max-width',
]);
const CP_STATES = new Set([
  'hover',
  'active',
  'disabled',
  'focus',
  'current',
  'done',
  'selected',
  'open',
  'ondark',
  'onlight',
]);

function segmentTokenName(name) {
  const parts = name.slice(2).split('-');
  let out = '--' + span('tk-cp-category', parts[0]);
  let i = 1;
  /* Type: the longest known type phrase (types may be two segments,
     e.g. min-width). */
  if (parts.length > 2) {
    const two = parts.slice(1, 3).join('-');
    if (CP_TYPES.has(two)) {
      out += '-' + span('tk-cp-type', two);
      i = 3;
    } else if (CP_TYPES.has(parts[1])) {
      out += '-' + span('tk-cp-type', parts[1]);
      i = 2;
    }
  }
  /* State tail: a state word or a numeric weight, when an item segment
     remains in front of it. */
  let tail = null;
  if (parts.length - i > 1) {
    const last = parts[parts.length - 1];
    if (CP_STATES.has(last) || /^\d+$/.test(last)) tail = last;
  }
  const middle = parts.slice(i, tail ? parts.length - 1 : parts.length);
  if (middle.length) out += '-' + middle.map((p) => span('tk-cp-item', p)).join('-');
  if (tail) out += '-' + span('tk-cp-state', tail);
  return out;
}

function hlCSS(src) {
  const re =
    /(\/\*[\s\S]*?\*\/)|(--[a-zA-Z][\w-]*)|([{}])|([a-zA-Z-]+)(\s*:)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?(?:px|rem|em|%|s|ms|vh|vw|fr)?)\b|(@[\w-]+)/g;
  return highlightWith(re, src, (m) => {
    if (m[1]) return span('tk-com', m[1]);
    if (m[2]) return segmentTokenName(m[2]);
    if (m[3]) return span('tk-tag', m[3]);
    if (m[4]) return span('tk-attr', m[4]) + escHtml(m[5]);
    if (m[6]) return span('tk-str', m[6]);
    if (m[7]) return span('tk-num', m[7]);
    if (m[8]) return span('tk-dir', m[8]);
    return escHtml(m[0]);
  });
}

/* Shell: a command line. A # comment, the command word that starts a
   line or follows a pipe/&&/;, flags, strings, $VARS and numbers. */
function hlShell(src) {
  return src
    .split('\n')
    .map((line) => {
      if (/^\s*#/.test(line)) return span('tk-com', line);
      const re =
        /(\s#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\$\{?[A-Za-z_][\w]*\}?)|((?:^\s*\$\s+|^|&&|\|\||[|;])\s*)([A-Za-z_./@][\w./@:-]*)|(\s)(--?[A-Za-z][\w-]*)|\b(\d+(?:\.\d+)*)\b/g;
      return highlightWith(re, line, (m) => {
        if (m[1]) return span('tk-com', m[1]);
        if (m[2]) return span('tk-str', m[2]);
        if (m[3]) return span('tk-bind', m[3]);
        if (m[5]) {
          const lead = m[4].includes('$')
            ? m[4].replace(/\$/, (d) => span('tk-com', d))
            : escHtml(m[4]);
          return lead + span('tk-fn', m[5]);
        }
        if (m[7]) return escHtml(m[6]) + span('tk-attr', m[7]);
        if (m[8]) return span('tk-num', m[8]);
        return escHtml(m[0]);
      });
    })
    .join('\n');
}

const HIGHLIGHTERS = { html: hlHTML, js: hlJS, ts: hlJS, css: hlCSS, sh: hlShell };

export { hlHTML, hlJS, hlCSS, hlShell, HIGHLIGHTERS, segmentTokenName };
