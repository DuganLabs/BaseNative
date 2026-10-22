/**
 * Convert the React habits models emit into BaseNative.
 *
 * This is a textual translator for the subset that shows up in a first draft:
 * `className`, `htmlFor`, `onClick={handler}`, `const [x, setX] = useState(…)`,
 * and `{expr}` text. It is not a JSX parser. Nested JSX expressions with their
 * own braces, spreads, and fragments-inside-attributes are left in place and
 * named in `notes` so a model can finish them.
 *
 * @param {string} source
 * @returns {{ code: string, notes: string[] }}
 */
export function fromJsx(source) {
  const notes = [];
  let code = String(source ?? '');

  code = code.replace(
    /import\s+[^;]*from\s+['"]react(?:\/[^'"]*)?['"];?/g,
    '/* removed React import — import { signal, computed, effect, hydrate } from \'@basenative/runtime\' */',
  );

  code = code.replace(
    /const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*set([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState\s*\(([^)]*)\)/g,
    (_, name, setter, init) => {
      notes.push(`set${setter}(…) is now ${name}.set(…). An updater function must read ${name}() itself.`);
      return `const ${name} = signal(${init})`;
    },
  );
  code = code.replace(/\buseMemo\s*\(/g, 'computed(');
  code = code.replace(/\buseEffect\s*\(/g, 'effect(');
  code = code.replace(/\buseState\s*\(/g, 'signal(');

  code = code.replace(/<>/g, '').replace(/<\/>/g, '');

  code = rewriteAttributes(code, notes);
  code = rewriteTextBraces(code);

  if (!code.includes('@basenative/runtime') && /\b(signal|computed|effect|hydrate)\b/.test(code)) {
    notes.push("Add: import { signal, computed, effect, hydrate } from '@basenative/runtime'");
  }
  return { code, notes };
}

function rewriteAttributes(source, notes) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const slice = source.slice(i);
    const attr = /^(className|htmlFor|on[A-Z][A-Za-z]*)(?=\s*=)/.exec(slice);
    const boundary = i === 0 || /[\s</]/.test(source[i - 1]);
    if (!attr || !boundary) {
      out += source[i];
      i += 1;
      continue;
    }
    let j = i + attr[0].length;
    while (source[j] === ' ' || source[j] === '\n' || source[j] === '\t') j += 1;
    if (source[j] !== '=') {
      out += source[i];
      i += 1;
      continue;
    }
    j += 1;
    while (source[j] === ' ' || source[j] === '\n' || source[j] === '\t') j += 1;
    const name = attr[1];
    if (source[j] === '"' || source[j] === "'") {
      const quote = source[j];
      const end = source.indexOf(quote, j + 1);
      if (end === -1) {
        notes.push(`Unclosed ${name} attribute left unchanged.`);
        out += source[i];
        i += 1;
        continue;
      }
      const value = source.slice(j + 1, end);
      out += convertAttr(name, value, false);
      i = end + 1;
      continue;
    }
    if (source[j] === '{') {
      const end = matchingBrace(source, j);
      if (end === -1) {
        notes.push(`${name}={…} has unbalanced braces and was left unchanged.`);
        out += source[i];
        i += 1;
        continue;
      }
      const value = source.slice(j + 1, end).trim();
      if (value.includes('{')) notes.push(`${name} contained a nested brace; check the rewritten expression.`);
      out += convertAttr(name, value, true);
      i = end + 1;
      continue;
    }
    out += source[i];
    i += 1;
  }
  return out;
}

function convertAttr(name, value, fromBrace) {
  if (name === 'className') {
    return fromBrace || /[()?:]/.test(value) ? `:class="${value}"` : `class="${value}"`;
  }
  if (name === 'htmlFor') return `for="${value}"`;
  const event = name.slice(2).toLowerCase();
  if (/^[A-Za-z_$][\w$]*$/.test(value)) return `@${event}="${value}($event)"`;
  const body = value.replace(/^\(\)\s*=>\s*/, '').replace(/^\([^)]*\)\s*=>\s*/, '');
  return `@${event}="${body}"`;
}

/** `{expr}` in markup becomes `{{ expr }}`. Skips `<script>` blocks and existing `{{ }}`. */
function rewriteTextBraces(source) {
  const parts = source.split(/(<script[\s\S]*?<\/script>)/gi);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replace(/(?<!\{)\{(?!\{)([^{}]+)\}(?!\})/g, (_, expr) => `{{ ${expr.trim()} }}`);
    })
    .join('');
}

function matchingBrace(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
