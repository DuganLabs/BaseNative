import { compileExpression } from '@basenative/runtime/shared/expression';
import { diagnostic, ERROR, WARNING, CONFIDENCE } from './codes.js';
import { scanTags, scanInterpolations, spanAt } from './scan.js';
import { foreignAttribute, FOREIGN_BLOCKS, FOREIGN_REACTIVITY } from './foreign.js';

/** Directives BaseNative defines on a <template>. */
const TEMPLATE_DIRECTIVES = new Set([
  'if', 'else', 'for', 'empty', 'switch', 'case', 'default', 'defer', 'catch',
]);

/**
 * Directives that only mean anything as control flow. On a non-template element
 * every `@name` becomes an addEventListener, so these fail silently there.
 */
const CONTROL_FLOW = new Set(['if', 'else', 'for', 'empty', 'switch', 'case', 'default']);

/** Branch directives and the directive that must govern them. */
const BRANCH_PARENT = {
  else: { governor: 'if', relation: 'previous sibling' },
  empty: { governor: 'for', relation: 'previous sibling' },
  case: { governor: 'switch', relation: 'ancestor' },
  default: { governor: 'switch', relation: 'ancestor' },
};

/** `item of items; track item.id` — mirrors the runtime's own @for grammar. */
const FOR_RE = /^\s*(\w+)\s+of\s+(.+?)(?:\s*;\s*track\s+(.+?))?\s*$/;

/** Levenshtein distance, capped — used only for "did you mean" suggestions. */
function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, i) => i);
  for (let i = 1; i < rows; i++) {
    const cur = [i];
    for (let j = 1; j < cols; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[cols - 1];
}

/**
 * Closest known name, or null. The threshold scales with length so short names
 * do not match everything, and a suggestion is only offered when it is close
 * enough to be worth acting on without checking the docs.
 */
function nearestName(name, known) {
  let best = null;
  let bestDistance = Infinity;
  const limit = Math.max(1, Math.floor(name.length / 3) + 1);
  for (const candidate of known) {
    if (candidate === name) continue;
    const d = editDistance(name.toLowerCase(), candidate.toLowerCase());
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return bestDistance <= limit ? best : null;
}

/** Collect the root identifier of every reference in a compiled expression AST. */
function rootIdentifiers(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'Identifier') {
    out.add(node.name);
    return out;
  }
  if (node.type === 'MemberExpression') {
    rootIdentifiers(node.object, out);
    // A non-computed property is a field name, not a reference to resolve.
    if (node.computed) rootIdentifiers(node.property, out);
    return out;
  }
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => rootIdentifiers(c, out));
    else if (child && typeof child === 'object') rootIdentifiers(child, out);
  }
  return out;
}

/**
 * Check one expression against the CSP-safe subset, and against the context when
 * one is supplied. `locals` are names bound by an enclosing @for.
 */
const UNSAFE_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);

/** Statically flag member reads the evaluator will refuse at runtime. */
function unsafeMemberReads(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'MemberExpression') {
    const prop = node.property;
    if (!node.computed && prop?.type === 'Identifier' && UNSAFE_PROPERTIES.has(prop.name)) {
      out.push(prop.name);
    }
    // A non-primitive computed key exists only to smuggle a blocked name past a
    // type check — it coerces back to a string on the property read.
    if (node.computed && (prop?.type === 'ArrayExpression' || prop?.type === 'ObjectExpression')) {
      out.push('<computed object key>');
    }
    if (node.computed && prop?.type === 'Literal' && UNSAFE_PROPERTIES.has(String(prop.value))) {
      out.push(String(prop.value));
    }
  }
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => unsafeMemberReads(c, out));
    else if (child && typeof child === 'object') unsafeMemberReads(child, out);
  }
  return out;
}

/**
 * Check one expression against the CSP-safe subset, and against the context when
 * one is supplied. `locals` are names bound by an enclosing @for.
 *
 * compileExpression does not throw — it returns { ast } or { error }.
 */
function checkExpression(expr, offset, source, context, locals, out) {
  const compiled = compileExpression(expr);

  if (compiled.error) {
    out.push(
      diagnostic('BN_E_EXPR_UNSUPPORTED', {
        message: `Expression "${expr}" is outside the CSP-safe subset (${compiled.error.code} at offset ${compiled.error.index})`,
        suggestion:
          'The evaluator supports identifiers, member and computed access, calls, ' +
          'literals, unary/binary/logical/conditional operators, and array/object literals — ' +
          'no arrow functions, no `new`, no optional chaining, no `??`. ' +
          'Move the logic into a named function on the context and call it, e.g. ' +
          'context.compute = () => { ... } then use "compute()".',
        span: spanAt(source, offset),
      })
    );
    return;
  }

  const ast = compiled.ast;

  // A single template expression must be a single expression. The tokenizer treats
  // reserved words it does not implement (`new`, `typeof`, `delete`) as bare
  // identifiers, so `new Date()` parses cleanly as TWO statements — an identifier
  // `new` followed by a call `Date()` — and would otherwise be reported as valid
  // while doing something the author never intended.
  if (Array.isArray(ast?.body) && ast.body.length > 1) {
    const leading = ast.body[0]?.type === 'Identifier' ? ast.body[0].name : null;
    out.push(
      diagnostic('BN_E_EXPR_UNSUPPORTED', {
        message: leading
          ? `Expression "${expr}" is not a single expression — "${leading}" is not supported and was parsed as a bare identifier`
          : `Expression "${expr}" parses as ${ast.body.length} separate expressions, not one`,
        suggestion: leading
          ? `"${leading}" is not part of the CSP-safe subset. Compute the value in a named function on the context and call it, e.g. "now()" backed by context.now = () => new Date().`
          : 'Use a single expression. Move any additional logic into a named function on the context.',
        span: spanAt(source, offset),
      })
    );
    return;
  }

  for (const name of unsafeMemberReads(ast)) {
    out.push(
      diagnostic('BN_E_EXPR_UNSUPPORTED', {
        message: `Expression "${expr}" reads "${name}", which the CSP-safe evaluator blocks`,
        suggestion:
          'Remove the prototype/constructor access. If you need a derived value, ' +
          'compute it in a named function on the context and call that instead.',
        span: spanAt(source, offset),
      })
    );
  }

  if (!context) return;
  for (const name of rootIdentifiers(ast)) {
    if (locals.has(name) || name in context) continue;
    if (name === '$event' || name === '$el') continue;
    const known = [...Object.keys(context), ...locals];
    const near = nearestName(name, known);
    out.push(
      diagnostic('BN_E_UNBOUND_REF', {
        message: `"${name}" is not a key of the supplied context`,
        suggestion: near
          ? `Did you mean "${near}"? Otherwise add "${name}" to the context object.`
          : `Add "${name}" to the context object passed to render()/hydrate(). Available keys: ${known.join(', ') || '(none)'}`,
        span: spanAt(source, offset),
        confidence: near ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
      })
    );
  }
}

/**
 * Validate a BaseNative template.
 *
 * @param {string} source  Template markup.
 * @param {object} [options]
 * @param {object} [options.context]  When supplied, unbound references are reported.
 * @returns {{ valid: boolean, diagnostics: Array }}
 */
export function validateTemplate(source, options = {}) {
  const src = String(source ?? '');
  const { context = null } = options;
  const out = [];

  // --- foreign block syntax and reactivity primitives (text-level) ---
  for (const rule of [...FOREIGN_BLOCKS, ...FOREIGN_REACTIVITY]) {
    rule.match.lastIndex = 0;
    let m;
    while ((m = rule.match.exec(src)) !== null) {
      out.push(
        diagnostic('BN_E_FOREIGN_DIRECTIVE', {
          message: `"${m[0].trim()}" is ${rule.framework} syntax, which BaseNative does not parse`,
          suggestion: rule.suggestion,
          span: spanAt(src, m.index),
        })
      );
    }
  }

  const tags = scanTags(src);
  // Stack of open <template> elements, so @case/@default can find a @switch
  // ancestor and @else/@empty can find their preceding sibling.
  const stack = [];
  let prevSibling = null;
  const localsAt = () => {
    const s = new Set();
    for (const f of stack) if (f.forItem) s.add(f.forItem);
    return s;
  };

  for (const tag of tags) {
    if (tag.closing) {
      const popped = stack.pop();
      prevSibling = popped ?? null;
      continue;
    }

    const isTemplate = tag.tagName === 'template';
    const frame = { directives: new Set(), forItem: null, tagName: tag.tagName };
    const locals = localsAt();

    for (const attr of tag.attrs) {
      const span = spanAt(src, attr.offset);

      // --- foreign attribute directives ---
      const foreign = foreignAttribute(attr.name);
      if (foreign) {
        out.push(
          diagnostic('BN_E_FOREIGN_DIRECTIVE', {
            message: `"${attr.name}" is ${foreign.framework} syntax; BaseNative does not support it${foreign.note ? ` — ${foreign.note}` : ''}`,
            suggestion: foreign.rewrite(attr.value ?? '', attr.name),
            span,
          })
        );
        continue;
      }

      if (attr.name.startsWith(':')) {
        if (attr.value != null) checkExpression(attr.value, attr.offset, src, context, locals, out);
        continue;
      }

      if (!attr.name.startsWith('@')) {
        // Interpolations inside a plain attribute value are checked globally below.
        continue;
      }

      const directive = attr.name.slice(1);

      if (!isTemplate) {
        // On a normal element `@x` is an event listener. Control-flow names there
        // are almost certainly a mistake, and one that never surfaces at runtime.
        if (CONTROL_FLOW.has(directive)) {
          out.push(
            diagnostic('BN_E_CONTROL_FLOW_ON_ELEMENT', {
              message:
                `"@${directive}" on <${tag.tagName}> is registered as an event listener, not control flow — ` +
                `it will silently never render conditionally`,
              suggestion: `<template @${directive}${attr.value != null ? `="${attr.value}"` : ''}> <${tag.tagName}> … </${tag.tagName}> </template>`,
              span,
            })
          );
        }
        continue;
      }

      // --- on a <template> ---
      if (!TEMPLATE_DIRECTIVES.has(directive)) {
        const known = [...TEMPLATE_DIRECTIVES];
        const near = known.find((k) => k.startsWith(directive.slice(0, 2)));
        out.push(
          diagnostic('BN_E_UNKNOWN_DIRECTIVE', {
            message: `"@${directive}" is not a BaseNative directive`,
            suggestion: near
              ? `Did you mean "@${near}"? Valid directives: ${known.map((k) => '@' + k).join(', ')}`
              : `Valid directives: ${known.map((k) => '@' + k).join(', ')}`,
            span,
          })
        );
        continue;
      }

      frame.directives.add(directive);

      // --- orphan branch check ---
      const rel = BRANCH_PARENT[directive];
      if (rel) {
        const governed =
          rel.relation === 'ancestor'
            ? stack.some((f) => f.directives.has(rel.governor))
            : Boolean(prevSibling?.directives?.has(rel.governor));
        if (!governed) {
          out.push(
            diagnostic('BN_E_ORPHAN_BRANCH', {
              message: `"@${directive}" has no governing "@${rel.governor}" as its ${rel.relation}`,
              suggestion:
                rel.relation === 'ancestor'
                  ? `Wrap it: <template @${rel.governor}="value"> <template @${directive}${attr.value != null ? `="${attr.value}"` : ''}> … </template> </template>`
                  : `Place it directly after the closing tag of the <template @${rel.governor}="…"> it belongs to`,
              span,
            })
          );
        }
      }

      // --- @for grammar ---
      if (directive === 'for') {
        const value = attr.value ?? '';
        const m = FOR_RE.exec(value);
        if (!m) {
          out.push(
            diagnostic('BN_E_MALFORMED_FOR', {
              message: `@for="${value}" does not match "item of items; track item.id"`,
              suggestion: `@for="item of ${value.trim() || 'items'}; track item.id"`,
              span,
            })
          );
        } else {
          const [, item, list, track] = m;
          frame.forItem = item;
          if (!track) {
            out.push(
              diagnostic('BN_E_MALFORMED_FOR', {
                // The runtime accepts a missing track, so this must not be an error.
                severity: WARNING,
                message: `@for="${value}" has no "track" expression; list reconciliation falls back to index order`,
                suggestion: `@for="${item} of ${list}; track ${item}.id"`,
                span,
              })
            );
          }
          const withItem = new Set([...locals, item]);
          checkExpression(list, attr.offset, src, context, locals, out);
          if (track) checkExpression(track, attr.offset, src, context, withItem, out);
        }
        continue;
      }

      if (attr.value != null && directive !== 'else' && directive !== 'default' && directive !== 'empty') {
        checkExpression(attr.value, attr.offset, src, context, locals, out);
      }
    }

    // Self-closing or void elements never open a scope.
    const selfClosing = tag.raw.endsWith('/>');
    if (!selfClosing) stack.push(frame);
    else prevSibling = frame;
    if (!selfClosing) prevSibling = null;
  }

  // --- interpolations ---
  for (const { expression, offset } of scanInterpolations(src)) {
    // Locals from an enclosing @for are not tracked per-offset here; pass every
    // @for item name found in the template so a valid loop body is not flagged.
    const allLocals = new Set();
    for (const tag of tags) {
      for (const a of tag.attrs ?? []) {
        if (a.name === '@for' && a.value) {
          const m = FOR_RE.exec(a.value);
          if (m) allLocals.add(m[1]);
        }
      }
    }
    checkExpression(expression, offset, src, context, allLocals, out);
  }

  out.sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
  return { valid: !out.some((d) => d.severity === ERROR), diagnostics: out };
}
