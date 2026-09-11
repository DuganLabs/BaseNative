/**
 * JS string/template-literal lexing, shared by every tool that has to find
 * BaseNative markup inside JavaScript source.
 *
 * This module is deliberately NOT a markup parser. Tag and attribute parsing is
 * done exclusively by `scanTags` from packages/validate/src/scan.js — the same
 * linear, ReDoS-safe tokenizer the validator, the renderer and the client binder
 * use. What lives here is the strictly different question of *where a JS string or
 * template literal begins and ends, and where its `${ }` holes fall*, so that the
 * real tokenizer can then be run on text that is actually markup rather than on
 * whole JS files.
 *
 * Extracted from scripts/component-usage.js (Phase 0) verbatim so that the usage
 * scanner, the component-index generator and the design-system linter cannot
 * disagree with each other about what counts as template content. The only
 * additions are `extractDefinitionSegments` and `PLACEHOLDER` at the bottom,
 * which are documented separately because they trade a different set of risks.
 */

// -----------------------------------------------------------------------
// Line/column
// -----------------------------------------------------------------------

/**
 * 1-based line/col for an offset. Builds the line-start index once per file so
 * repeated lookups are a binary search rather than a rescan.
 */
export function lineIndex(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return (offset) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - starts[lo] + 1 };
  };
}

// -----------------------------------------------------------------------
// Regex literals
//
// Without this, one line desynchronises a whole file. `packages/favicon/src/
// glyphs.js` contains
//
//     .replace(/"/g, "&quot;")
//
// and a lexer that does not know `/"/g` is a regex reads that `"` as the start
// of a string literal. Every quote after it is then off by one: 33 of the
// "strings" found in that file afterwards are actually code, the `/** … */`
// before `renderGlyph` is swallowed, and the function is invisible. The same
// shape appears in packages/keyboard, packages/combobox, packages/admin and
// packages/builder — six components' markup contracts in total.
//
// Telling a regex from a division needs the previous token, so the test below is
// the usual one (a `/` cannot start a regex directly after a value) plus a hard
// safety net: an unterminated regex, or one that runs past end-of-line, is
// rejected and re-read as division. A misfire therefore degrades to the previous
// behaviour rather than eating code.
// -----------------------------------------------------------------------

const REGEX_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);

function isIdentChar(c) {
  return /[A-Za-z0-9_$]/.test(c);
}

/** Can a `/` at `index` begin a regular expression, given what precedes it? */
export function regexAllowedAt(source, index) {
  let i = index - 1;
  while (i >= 0) {
    const c = source[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') { i--; continue; }
    break;
  }
  if (i < 0) return true;
  const c = source[i];
  if (isIdentChar(c)) {
    let j = i;
    while (j >= 0 && isIdentChar(source[j])) j--;
    return REGEX_KEYWORDS.has(source.slice(j + 1, i + 1));
  }
  // `)` and `]` end a value (`(a+b)/2`, `xs[0]/2`); `}` is ambiguous (block vs
  // object literal) and is treated as value-ending, which is the conservative
  // choice — it can only ever cause a regex to be read as division, never the
  // reverse.
  return !(c === ')' || c === ']' || c === '}' || c === '"' || c === "'" || c === '`');
}

/**
 * Index of the closing `/` of the regex literal starting at `start`, or -1 when
 * it is not one (unterminated, or a line break before the close).
 */
export function readRegexLiteral(source, start) {
  const n = source.length;
  let i = start + 1;
  let inClass = false;
  while (i < n) {
    const c = source[i];
    if (c === '\n' || c === '\r') return -1;
    if (c === '\\') { i += 2; continue; }
    if (inClass) {
      if (c === ']') inClass = false;
      i++;
      continue;
    }
    if (c === '[') { inClass = true; i++; continue; }
    if (c === '/') return i;
    i++;
  }
  return -1;
}

// -----------------------------------------------------------------------
// Generic JS lexing: template-literal and string-literal boundaries.
// -----------------------------------------------------------------------

/**
 * Reads a template literal starting at the backtick index `start`. Returns
 * { end, holes } where `end` is the index of the closing backtick and each
 * hole is `{ start, end }` spanning `${` ... the matching `}` (end is just
 * past the `}`). Returns null if the literal never closes (malformed/EOF).
 */
export function readTemplateLiteral(source, start) {
  const n = source.length;
  let i = start + 1;
  const holes = [];
  while (i < n) {
    const c = source[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return { end: i, holes };
    if (c === '$' && source[i + 1] === '{') {
      const holeStart = i;
      let j = i + 2;
      let depth = 1;
      while (j < n && depth > 0) {
        const cj = source[j];
        if (cj === '\\') { j += 2; continue; }
        if (cj === '`') {
          const nested = readTemplateLiteral(source, j);
          j = nested ? nested.end + 1 : j + 1;
          continue;
        }
        if (cj === '"' || cj === "'") {
          const q = cj;
          j++;
          while (j < n && source[j] !== q) { j += source[j] === '\\' ? 2 : 1; }
          j++;
          continue;
        }
        if (cj === '/' && source[j + 1] === '/') {
          const k = source.indexOf('\n', j);
          j = k === -1 ? n : k;
          continue;
        }
        if (cj === '/' && source[j + 1] === '*') {
          const k = source.indexOf('*/', j + 2);
          j = k === -1 ? n : k + 2;
          continue;
        }
        if (cj === '/' && regexAllowedAt(source, j)) {
          const close = readRegexLiteral(source, j);
          if (close !== -1) { j = close + 1; continue; }
        }
        if (cj === '{') { depth++; j++; continue; }
        if (cj === '}') { depth--; j++; continue; }
        j++;
      }
      holes.push({ start: holeStart, end: j });
      i = j;
      continue;
    }
    i++;
  }
  return null;
}

/**
 * Walks a whole file once, finding every template literal (with its holes)
 * and every plain single/double-quoted string literal, skipping comments so
 * a commented-out `<div data-bn="...">` is not counted as a live usage.
 */
export function findStringLiterals(source) {
  const templates = [];
  const strings = [];
  const comments = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    if (c === '`') {
      const lit = readTemplateLiteral(source, i);
      if (lit) {
        templates.push({ start: i + 1, end: lit.end, holes: lit.holes });
        i = lit.end + 1;
      } else {
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && source[j] !== q) { j += source[j] === '\\' ? 2 : 1; }
      if (j < n) {
        strings.push({ start: i + 1, end: j });
        i = j + 1;
      } else {
        i++;
      }
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      const k = source.indexOf('\n', i);
      comments.push({ start: i, end: k === -1 ? n : k });
      i = k === -1 ? n : k;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const k = source.indexOf('*/', i + 2);
      comments.push({ start: i, end: k === -1 ? n : k + 2 });
      i = k === -1 ? n : k + 2;
      continue;
    }
    if (c === '/' && regexAllowedAt(source, i)) {
      const close = readRegexLiteral(source, i);
      if (close !== -1) { i = close + 1; continue; }
    }
    i++;
  }
  return { templates, strings, comments };
}

/**
 * Ranges of the file that are NOT executable JS — the literal text inside
 * string/template literals (never their `${ }` holes, which are real code)
 * plus comments.
 */
export function nonCodeRanges(source) {
  const { templates, strings, comments } = findStringLiterals(source);
  const ranges = [];
  for (const c of comments) ranges.push([c.start, c.end]);
  for (const s of strings) ranges.push([s.start - 1, s.end + 1]);
  for (const t of templates) {
    let cursor = t.start - 1;
    for (const hole of t.holes) {
      ranges.push([cursor, hole.start]);
      cursor = hole.end;
    }
    ranges.push([cursor, t.end + 1]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  }
  return merged;
}

export function isInRanges(ranges, index) {
  let lo = 0, hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, e] = ranges[mid];
    if (index < s) hi = mid - 1;
    else if (index >= e) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Turns the raw literal records into the static text segments that are safe
 * to hand to scanTags/scanInterpolations, each tagged with its absolute
 * offset into the original file so line/col stay accurate.
 *
 * LIMITATION (deliberate, not a bug): a `${...}` hole splits its template
 * into separate static segments rather than being bridged or guessed at. A
 * tag whose `>` — or whose `data-bn` attribute itself — falls on the far
 * side of a hole from where the tag opened is therefore invisible here. See
 * `extractDefinitionSegments` for the one place that trade is made the other
 * way round, and why.
 */
export function extractStaticSegments(source) {
  const { templates, strings } = findStringLiterals(source);
  const segments = [];

  for (const t of templates) {
    let cursor = t.start;
    for (const hole of t.holes) {
      if (hole.start > cursor) {
        segments.push({ start: cursor, text: source.slice(cursor, hole.start) });
      }
      cursor = hole.end;
    }
    if (t.end > cursor) {
      segments.push({ start: cursor, text: source.slice(cursor, t.end) });
    }
  }

  for (const s of strings) {
    if (s.end > s.start) {
      // Plain JS strings escape their own quote char and backslashes; template
      // literals don't use this quoting so they're left untouched above.
      const raw = source.slice(s.start, s.end);
      const text = raw.replace(/\\(["'\\])/g, '$1');
      segments.push({ start: s.start, text });
    }
  }

  // Only segments that could plausibly contain markup are worth tokenizing.
  return segments.filter((seg) => seg.text.includes('<') || seg.text.includes('{{'));
}

// -----------------------------------------------------------------------
// Definition-side extraction (hole-bridging)
// -----------------------------------------------------------------------

/**
 * The literal substituted for a `${...}` hole by `extractDefinitionSegments`.
 * Chosen so that it is a legal attribute value, a legal run of text, and never
 * a tag name a stylesheet could target; `isPlaceholder()` recognises it back.
 */
export const PLACEHOLDER = 'bnexpr';

/** True if `value` is (or contains) the hole placeholder — i.e. it was dynamic. */
export function isPlaceholder(value) {
  return typeof value === 'string' && value.includes(PLACEHOLDER);
}

/**
 * Like `extractStaticSegments`, but each `${...}` hole is replaced in place by
 * `PLACEHOLDER` instead of splitting the template, so a tag whose attributes or
 * closing `>` straddle a hole is still a complete tag for `scanTags`.
 *
 * WHY THE OPPOSITE TRADE IS CORRECT HERE. `extractStaticSegments` refuses to
 * bridge because it answers "who *uses* component X", over arbitrary files,
 * where a bridged hole can manufacture a usage record that the author never
 * wrote. This function answers a different question: "what markup contract does
 * *this renderer* emit", over the renderer's own body, where the failure mode of
 * not bridging is total. `renderBadge`'s entire output is
 *
 *     `<span data-bn="badge" data-variant="${escapeAttr(variant)}"...>`
 *
 * whose first static segment has no `>` at all, so `scanTags` finds nothing and
 * the component reports zero contracts. That is exactly why `dataBnNames` is
 * empty for 56 of the 61 components in .agents/component-usage.json.
 *
 * Bridging can never invent a tag: every `<`/`>` in the bridged text came from
 * the source. What it *can* do is lose tags that only exist at runtime (a hole
 * expanding to markup) and report an attribute value of `bnexpr` where the
 * source had an expression — both of which are visible in the output rather than
 * silent, via `isPlaceholder()`.
 */
export function extractDefinitionSegments(source) {
  const { templates, strings } = findStringLiterals(source);
  const segments = [];

  for (const t of templates) {
    let text = '';
    // `map` carries bridged-text-offset -> original-source-offset for the
    // static runs, so spans reported out of this still point at real source.
    const map = [];
    let cursor = t.start;
    for (const hole of t.holes) {
      if (hole.start > cursor) {
        map.push({ at: text.length, src: cursor, len: hole.start - cursor });
        text += source.slice(cursor, hole.start);
      }
      text += PLACEHOLDER;
      cursor = hole.end;
    }
    if (t.end > cursor) {
      map.push({ at: text.length, src: cursor, len: t.end - cursor });
      text += source.slice(cursor, t.end);
    }
    if (text.includes('<') || text.includes('{{')) segments.push({ text, map, start: t.start });
  }

  for (const s of strings) {
    if (s.end > s.start) {
      const raw = source.slice(s.start, s.end);
      const text = raw.replace(/\\(["'\\])/g, '$1');
      if (text.includes('<') || text.includes('{{')) {
        // Unescaping shifts offsets; only map when nothing was unescaped.
        const map = text.length === raw.length ? [{ at: 0, src: s.start, len: text.length }] : [];
        segments.push({ text, map, start: s.start });
      }
    }
  }

  return segments;
}

/**
 * Map an offset inside a bridged segment back to an absolute source offset.
 * Offsets that land inside a placeholder resolve to the start of the static run
 * that follows it (the nearest real source position), never to a fabricated one.
 */
export function resolveBridgedOffset(segment, offsetInText) {
  let best = segment.start;
  for (const run of segment.map) {
    if (offsetInText >= run.at && offsetInText < run.at + run.len) {
      return run.src + (offsetInText - run.at);
    }
    if (run.at <= offsetInText) best = run.src + run.len;
    else return run.src;
  }
  return best;
}
