/**
 * A small, exact CSS model: comments, declarations, and selector compounds.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A REGEX. The design-system audit's single
 * biggest error came from matching CSS with regexes over raw text: 125 of the 165
 * rows in .agents/ds-hardcoded.json are comment prose or half-parsed rules
 * (`'space-between'`, `'hover { background: var(--bn-color-surface-muted)'`, an
 * 80-character contrast-ratio note), because comments were never stripped and a
 * "declaration" was whatever a regex happened to bracket. Two further whole
 * classes of finding were missed for the same reason: an adjacency-only
 * `[data-bn=…][data-axis=…]` match silently drops every value inside an `:is(…)`
 * group (all 23 `pipeline-block` statuses) and every value containing `_`
 * (`in_progress`).
 *
 * So everything here works off a single linear walk that knows where strings,
 * parentheses, blocks and comments are. Nothing in this file is a template
 * parser — markup tokenizing is `scanTags`'s job, in packages/validate/src/scan.js.
 */

/* ------------------------------------------------------------------ comments */

/**
 * Blank every `/* … *\/` comment, preserving length and newlines so that every
 * offset into the result still addresses the original text, and return the
 * comments separately (the escape-hatch annotations live in them, so they have to
 * be readable *after* stripping).
 */
export function stripComments(css) {
  const comments = [];
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      const raw = css.slice(i, stop);
      comments.push({ start: i, end: stop, raw });
      out += raw.replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && css[j] !== q) j += css[j] === '\\' ? 2 : 1;
      j = Math.min(j + 1, n);
      out += css.slice(i, j);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return { code: out, comments };
}

/* -------------------------------------------------------------- declarations */

/**
 * Walk a stylesheet and yield every real declaration with its governing selector
 * and exact offsets. At-rule preludes (`@layer components`, `@media …`) are
 * carried on `atRules` rather than mistaken for selectors, and anything inside
 * balanced parentheses (`var(--x, calc(1px + 2px))`) cannot terminate a
 * declaration.
 *
 * Input must already have been through `stripComments` — offsets are preserved
 * by that function precisely so this one can be fed its output.
 */
export function parseDeclarations(code) {
  const decls = [];
  const stack = [];          // { prelude, isAtRule }
  const n = code.length;
  let i = 0;
  let segStart = 0;
  let paren = 0;

  const flushDecl = (end) => {
    const text = code.slice(segStart, end);
    if (!text.trim()) return;
    const colon = text.indexOf(':');
    if (colon === -1) return;
    const propRaw = text.slice(0, colon);
    const prop = propRaw.trim();
    if (!prop || /[{}]/.test(prop)) return;
    const valueRaw = text.slice(colon + 1);
    const value = valueRaw.trim();
    if (!value) return;
    const propOffset = segStart + propRaw.indexOf(prop);
    const valueOffset = segStart + colon + 1 + valueRaw.indexOf(value);
    const selectors = stack.filter((f) => !f.isAtRule).map((f) => f.prelude);
    decls.push({
      prop,
      value,
      propOffset,
      valueOffset,
      selector: selectors[selectors.length - 1] ?? '',
      selectorChain: selectors,
      atRules: stack.filter((f) => f.isAtRule).map((f) => f.prelude),
    });
  };

  while (i < n) {
    const c = code[i];
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && code[j] !== q) j += code[j] === '\\' ? 2 : 1;
      i = Math.min(j + 1, n);
      continue;
    }
    if (c === '(') { paren++; i++; continue; }
    if (c === ')') { if (paren > 0) paren--; i++; continue; }
    if (paren > 0) { i++; continue; }

    if (c === '{') {
      const prelude = code.slice(segStart, i).trim();
      stack.push({ prelude, isAtRule: prelude.startsWith('@') });
      segStart = i + 1;
      i++;
      continue;
    }
    if (c === '}') {
      flushDecl(i);
      stack.pop();
      segStart = i + 1;
      i++;
      continue;
    }
    if (c === ';') {
      flushDecl(i);
      segStart = i + 1;
      i++;
      continue;
    }
    i++;
  }
  return decls;
}

/** Every rule prelude (selector) in the sheet, in source order, with its offset. */
export function parseSelectors(code) {
  const selectors = [];
  const n = code.length;
  let i = 0;
  let segStart = 0;
  let paren = 0;
  while (i < n) {
    const c = code[i];
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && code[j] !== q) j += code[j] === '\\' ? 2 : 1;
      i = Math.min(j + 1, n);
      continue;
    }
    if (c === '(') { paren++; i++; continue; }
    if (c === ')') { if (paren > 0) paren--; i++; continue; }
    if (paren > 0) { i++; continue; }
    if (c === '{') {
      const raw = code.slice(segStart, i);
      const prelude = raw.trim();
      if (prelude && !prelude.startsWith('@')) {
        selectors.push({ prelude, offset: segStart + raw.indexOf(prelude.slice(0, 1)) });
      }
      segStart = i + 1;
      i++;
      continue;
    }
    if (c === '}' || c === ';') { segStart = i + 1; i++; continue; }
    i++;
  }
  return selectors;
}

/* ----------------------------------------------------------------- selectors */

/** Split on `sep` at nesting depth 0 (parens, brackets and quotes are opaque). */
export function splitTopLevel(text, sep) {
  const out = [];
  let depthParen = 0;
  let depthBracket = 0;
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < text.length && text[j] !== q) j += text[j] === '\\' ? 2 : 1;
      buf += text.slice(i, Math.min(j + 1, text.length));
      i = j;
      continue;
    }
    if (c === '(') depthParen++;
    else if (c === ')') depthParen = Math.max(0, depthParen - 1);
    else if (c === '[') depthBracket++;
    else if (c === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (c === sep && depthParen === 0 && depthBracket === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Split a complex selector into its compound selectors, dropping combinators. */
export function splitCompounds(selector) {
  const out = [];
  let depthParen = 0;
  let depthBracket = 0;
  let buf = '';
  const push = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < selector.length && selector[j] !== q) j += selector[j] === '\\' ? 2 : 1;
      buf += selector.slice(i, Math.min(j + 1, selector.length));
      i = j;
      continue;
    }
    if (c === '(') depthParen++;
    else if (c === ')') depthParen = Math.max(0, depthParen - 1);
    else if (c === '[') depthBracket++;
    else if (c === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (depthParen === 0 && depthBracket === 0 && (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '>' || c === '+' || c === '~')) {
      push();
      continue;
    }
    buf += c;
  }
  push();
  return out;
}

/**
 * Expand a compound selector's `:is(…)` / `:where(…)` groups into the full set of
 * concrete compounds it stands for, so
 * `:is([data-bn="a"], [data-bn="b"]):is([data-status="x"], [data-status="y"])`
 * yields all four `[data-bn=…][data-status=…]` pairs rather than none.
 */
export function expandCompound(compound) {
  const parts = [];
  let i = 0;
  let literal = '';
  const n = compound.length;
  while (i < n) {
    const isGroup = compound.startsWith(':is(', i) || compound.startsWith(':where(', i);
    if (isGroup) {
      const open = compound.indexOf('(', i);
      let depth = 0;
      let j = open;
      for (; j < n; j++) {
        if (compound[j] === '(') depth++;
        else if (compound[j] === ')') { depth--; if (depth === 0) break; }
      }
      if (literal) { parts.push({ kind: 'lit', text: literal }); literal = ''; }
      const inner = compound.slice(open + 1, j);
      parts.push({ kind: 'group', options: splitTopLevel(inner, ',') });
      i = j + 1;
      continue;
    }
    if (compound[i] === '[') {
      let j = i + 1;
      while (j < n && compound[j] !== ']') {
        if (compound[j] === '"' || compound[j] === "'") {
          const q = compound[j];
          j++;
          while (j < n && compound[j] !== q) j += compound[j] === '\\' ? 2 : 1;
        }
        j++;
      }
      literal += compound.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }
    literal += compound[i];
    i++;
  }
  if (literal) parts.push({ kind: 'lit', text: literal });

  let results = [''];
  for (const part of parts) {
    if (part.kind === 'lit') {
      results = results.map((r) => r + part.text);
    } else {
      const next = [];
      for (const r of results) {
        for (const opt of part.options) {
          // An option may itself be a compound with its own :is(...) groups.
          for (const expanded of expandCompound(opt)) next.push(r + expanded);
        }
      }
      results = next;
    }
  }
  return results;
}

/** Parse `[name="value"]` / `[name]` attribute conditions out of a compound. */
export function attributeConditions(compound) {
  const out = [];
  const n = compound.length;
  let i = 0;
  while (i < n) {
    if (compound[i] !== '[') { i++; continue; }
    let j = i + 1;
    let body = '';
    while (j < n && compound[j] !== ']') {
      if (compound[j] === '"' || compound[j] === "'") {
        const q = compound[j];
        const start = j;
        j++;
        while (j < n && compound[j] !== q) j += compound[j] === '\\' ? 2 : 1;
        body += compound.slice(start, Math.min(j + 1, n));
        j++;
        continue;
      }
      body += compound[j];
      j++;
    }
    i = j + 1;
    const eq = body.indexOf('=');
    if (eq === -1) {
      const name = body.trim();
      if (name) out.push({ name, value: null, operator: null });
      continue;
    }
    // `~=`, `|=`, `^=`, `$=`, `*=` — the operator char sits just before `=`.
    let nameEnd = eq;
    let operator = '=';
    if (eq > 0 && '~|^$*'.includes(body[eq - 1])) {
      operator = body[eq - 1] + '=';
      nameEnd = eq - 1;
    }
    const name = body.slice(0, nameEnd).trim();
    let value = body.slice(eq + 1).trim();
    value = value.replace(/\s+[iIsS]$/, '');
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (name) out.push({ name, value, operator });
  }
  return out;
}

/**
 * Every `{ contract, axis, value }` a stylesheet declares, where `contract` is a
 * `data-bn` value and `axis` is another `data-*` attribute constrained in the
 * same compound. `value === null` means the rule matches the attribute's mere
 * presence (`[data-bn="pipeline-block"][data-status]`) — the documented fallback
 * shape, which is why it is reported rather than dropped.
 */
export function declaredAxes(code) {
  const found = [];
  for (const { prelude } of parseSelectors(code)) {
    for (const selector of splitTopLevel(prelude, ',')) {
      for (const compound of splitCompounds(selector)) {
        for (const expanded of expandCompound(compound)) {
          const attrs = attributeConditions(expanded);
          const bn = attrs.find((a) => a.name === 'data-bn' && a.value);
          if (!bn) continue;
          for (const a of attrs) {
            if (a.name === 'data-bn' || !a.name.startsWith('data-')) continue;
            found.push({
              contract: bn.value,
              axis: a.name.slice('data-'.length),
              value: a.value,
              // `=` enumerates one value; `^=`/`$=`/`*=`/`~=`/`|=` describe an
              // open-ended family (`[data-position^="top"]` styles `top-end` and
              // `top-start` too), so a consumer of this must not treat those as
              // members of a closed set.
              operator: a.operator,
              selector,
            });
          }
        }
      }
    }
  }
  return found;
}

/** Every `data-bn` contract that has at least one rule of its own in this sheet. */
export function declaredContracts(code) {
  const out = new Set();
  for (const { prelude } of parseSelectors(code)) {
    for (const selector of splitTopLevel(prelude, ',')) {
      for (const compound of splitCompounds(selector)) {
        for (const expanded of expandCompound(compound)) {
          for (const a of attributeConditions(expanded)) {
            if (a.name === 'data-bn' && a.value) out.add(a.value);
          }
        }
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------- tokens */

/** `var(--name, fallback)` references in a value, with the fallback text. */
export function varReferences(value) {
  const out = [];
  const re = /var\(\s*(--[A-Za-z0-9_-]+)\s*(,)?/g;
  let m;
  while ((m = re.exec(value))) {
    let depth = 1;
    let i = m.index + m[0].length;
    let buf = '';
    for (; i < value.length; i++) {
      const c = value[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
      buf += c;
    }
    // `raw` is the whole `var(…)` call, so a fix can substitute it in place
    // instead of rebuilding the declaration and dropping its other components.
    out.push({ name: m[1], fallback: m[2] ? buf.trim() : null, offset: m.index, raw: value.slice(m.index, i + 1) });
  }
  return out;
}
