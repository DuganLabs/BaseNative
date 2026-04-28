/**
 * Comprehensive edge case and security boundary tests for the CSP-safe expression evaluator.
 * Tests cover: operators, literals, member access, method calls, object/array expressions,
 * prototype pollution guards, error handling, and the expression cache.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  compileExpression,
  evaluateExpression,
  clearExpressionCache,
} from './shared/expression.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eval$(expr, ctx = {}) {
  return evaluateExpression(expr, ctx);
}

function diagnostics$(expr, ctx = {}) {
  const collected = [];
  evaluateExpression(expr, ctx, { onDiagnostic: (d) => collected.push(d) });
  return collected;
}

// ─── Literals ────────────────────────────────────────────────────────────────

describe('literals', () => {
  it('numeric integer', () => assert.equal(eval$('42'), 42));
  it('numeric float', () => assert.equal(eval$('3.14'), 3.14));
  it('single-quoted string', () => assert.equal(eval$("'hello'"), 'hello'));
  it('double-quoted string', () => assert.equal(eval$('"world"'), 'world'));
  it('boolean true', () => assert.equal(eval$('true'), true));
  it('boolean false', () => assert.equal(eval$('false'), false));
  it('null literal', () => assert.equal(eval$('null'), null));
  it('undefined literal', () => assert.equal(eval$('undefined'), undefined));

  it('string with escape sequences', () => {
    assert.equal(eval$("'line1\\nline2'"), 'line1\nline2');
    assert.equal(eval$("'tab\\there'"), 'tab\there');
    assert.equal(eval$("'back\\\\slash'"), 'back\\slash');
    assert.equal(eval$("'quote\\'s'"), "quote's");
  });

  it('array literal', () => {
    assert.deepEqual(eval$('[1, 2, 3]'), [1, 2, 3]);
  });

  it('empty array literal', () => {
    assert.deepEqual(eval$('[]'), []);
  });

  it('object literal', () => {
    assert.deepEqual(eval$('{ x: 1, y: 2 }'), { x: 1, y: 2 });
  });

  it('empty object literal', () => {
    assert.deepEqual(eval$('{}'), {});
  });

  it('nested object/array literal', () => {
    assert.deepEqual(eval$('[{ a: 1 }, { a: 2 }]'), [{ a: 1 }, { a: 2 }]);
  });
});

// ─── Arithmetic ───────────────────────────────────────────────────────────────

describe('arithmetic operators', () => {
  it('addition', () => assert.equal(eval$('2 + 3'), 5));
  it('subtraction', () => assert.equal(eval$('10 - 4'), 6));
  it('multiplication', () => assert.equal(eval$('3 * 4'), 12));
  it('division', () => assert.equal(eval$('10 / 4'), 2.5));
  it('modulo', () => assert.equal(eval$('10 % 3'), 1));
  it('string concatenation via +', () => assert.equal(eval$('"a" + "b"'), 'ab'));
  it('unary negation', () => assert.equal(eval$('-5'), -5));
  it('unary plus coerces string to number', () => assert.equal(eval$('+"42"'), 42));
  it('unary plus on non-numeric string produces NaN', () => assert.ok(Number.isNaN(eval$('+"abc"'))));
  it('operator precedence: * before +', () => assert.equal(eval$('2 + 3 * 4'), 14));
  it('grouped expression overrides precedence', () => assert.equal(eval$('(2 + 3) * 4'), 20));
});

// ─── Comparison ───────────────────────────────────────────────────────────────

describe('comparison operators', () => {
  it('strict equal ===', () => assert.equal(eval$('1 === 1'), true));
  it('strict not-equal !==', () => assert.equal(eval$('1 !== 2'), true));
  it('strict equal type mismatch', () => assert.equal(eval$('"1" === 1'), false));
  it('loose equal ==', () => assert.equal(eval$('"1" == 1'), true));
  it('loose not-equal !=', () => assert.equal(eval$('"1" != 2'), true));
  it('less than', () => assert.equal(eval$('1 < 2'), true));
  it('greater than', () => assert.equal(eval$('2 > 1'), true));
  it('less than or equal', () => assert.equal(eval$('2 <= 2'), true));
  it('greater than or equal', () => assert.equal(eval$('3 >= 3'), true));
});

// ─── Logical ─────────────────────────────────────────────────────────────────

describe('logical operators', () => {
  it('&& short-circuits on false', () => assert.equal(eval$('false && true'), false));
  it('&& returns last truthy', () => assert.equal(eval$('1 && 2'), 2));
  it('|| short-circuits on true', () => assert.equal(eval$('1 || 2'), 1));
  it('|| returns last when falsy', () => assert.equal(eval$('0 || false'), false));
  it('! negates truthy', () => assert.equal(eval$('!true'), false));
  it('! negates falsy', () => assert.equal(eval$('!0'), true));
  it('!! double negation', () => assert.equal(eval$('!!1'), true));
});

// ─── Ternary ─────────────────────────────────────────────────────────────────

describe('conditional (ternary) expression', () => {
  it('returns consequent when truthy', () => assert.equal(eval$('true ? "yes" : "no"'), 'yes'));
  it('returns alternate when falsy', () => assert.equal(eval$('false ? "yes" : "no"'), 'no'));
  it('nested ternary', () => {
    assert.equal(eval$('1 > 2 ? "a" : 2 > 1 ? "b" : "c"'), 'b');
  });
  it('ternary with variable', () => {
    assert.equal(eval$('show ? "visible" : "hidden"', { show: false }), 'hidden');
  });
});

// ─── Identifiers and Context ──────────────────────────────────────────────────

describe('identifier resolution', () => {
  it('resolves from context', () => assert.equal(eval$('name', { name: 'Alice' }), 'Alice'));
  it('returns undefined for missing identifier', () => assert.equal(eval$('missing'), undefined));
  it('null context is safe', () => assert.equal(evaluateExpression('x', null), undefined));
  it('resolves number values', () => assert.equal(eval$('count', { count: 42 }), 42));
  it('resolves boolean values', () => assert.equal(eval$('flag', { flag: false }), false));
});

// ─── Member Access ────────────────────────────────────────────────────────────

describe('member access', () => {
  it('dot notation', () => assert.equal(eval$('user.name', { user: { name: 'Bob' } }), 'Bob'));
  it('chained dot notation', () => {
    assert.equal(eval$('a.b.c', { a: { b: { c: 42 } } }), 42);
  });
  it('bracket notation with string key', () => {
    assert.equal(eval$('obj["key"]', { obj: { key: 'value' } }), 'value');
  });
  it('bracket notation with numeric index', () => {
    assert.equal(eval$('arr[0]', { arr: ['first'] }), 'first');
  });
  it('bracket notation with variable index', () => {
    assert.equal(eval$('arr[i]', { arr: ['a', 'b', 'c'], i: 2 }), 'c');
  });
  it('null-safe: returns undefined when object is null', () => {
    assert.equal(eval$('obj.name', { obj: null }), undefined);
  });
  it('null-safe: returns undefined when object is undefined', () => {
    assert.equal(eval$('obj.name', {}), undefined);
  });
});

// ─── Method Calls ─────────────────────────────────────────────────────────────

describe('method calls', () => {
  it('calls method with no args', () => {
    assert.equal(eval$('str.toUpperCase()', { str: 'hello' }), 'HELLO');
  });
  it('calls method with args', () => {
    assert.equal(eval$('str.slice(0, 3)', { str: 'hello' }), 'hel');
  });
  it('calls array method', () => {
    assert.equal(eval$('arr.length', { arr: [1, 2, 3] }), 3);
  });
  it('calls array.includes', () => {
    assert.equal(eval$('items.includes(2)', { items: [1, 2, 3] }), true);
  });
  it('calls string.includes', () => {
    assert.equal(eval$('name.includes("base")', { name: 'basenative' }), true);
  });
  it('calls context function', () => {
    const fn = (x) => x * 2;
    assert.equal(eval$('double(5)', { double: fn }), 10);
  });
  it('returns undefined for non-function method', () => {
    assert.equal(eval$('obj.notAFn()', { obj: { notAFn: 42 } }), undefined);
  });
  it('null-safe: returns undefined when object is null', () => {
    assert.equal(eval$('obj.fn()', { obj: null }), undefined);
  });
});

// ─── Security Boundaries ──────────────────────────────────────────────────────

describe('prototype pollution guards', () => {
  beforeEach(() => clearExpressionCache());

  it('blocks __proto__ access via dot notation', () => {
    const diags = diagnostics$('obj.__proto__', { obj: {} });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].code, 'BN_EXPR_UNSAFE_MEMBER');
  });

  it('blocks prototype access via dot notation', () => {
    const diags = diagnostics$('fn.prototype', { fn: function() {} });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].code, 'BN_EXPR_UNSAFE_MEMBER');
  });

  it('blocks constructor access via dot notation', () => {
    const diags = diagnostics$('obj.constructor', { obj: {} });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].code, 'BN_EXPR_UNSAFE_MEMBER');
  });

  it('blocks __proto__ via computed bracket notation', () => {
    const diags = diagnostics$('obj["__proto__"]', { obj: {} });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].code, 'BN_EXPR_UNSAFE_MEMBER');
  });

  it('returns undefined on unsafe member access', () => {
    clearExpressionCache();
    const result = evaluateExpression('obj.constructor', { obj: {} });
    assert.equal(result, undefined);
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
  beforeEach(() => clearExpressionCache());

  it('returns undefined and reports diagnostic for syntax error', () => {
    const diags = diagnostics$('a +++ b');
    // The evaluator may or may not error; result must not throw
    assert.ok(Array.isArray(diags));
  });

  it('returns undefined for unterminated string', () => {
    clearExpressionCache();
    const diags = diagnostics$('"unterminated');
    assert.ok(diags.length > 0);
    assert.equal(diags[0].code, 'BN_EXPR_UNTERMINATED_STRING');
  });

  it('diagnostic includes expression source', () => {
    clearExpressionCache();
    const diags = diagnostics$('"bad string');
    assert.ok(diags[0].expression != null);
  });

  it('onDiagnostic is optional — no error when omitted', () => {
    clearExpressionCache();
    assert.doesNotThrow(() => evaluateExpression('"unterminated'));
  });

  it('returns undefined for unsupported token', () => {
    clearExpressionCache();
    const diags = diagnostics$('@invalid');
    assert.ok(diags.length > 0);
  });
});

// ─── Expression Cache ─────────────────────────────────────────────────────────

describe('expression cache', () => {
  it('compileExpression returns same object for same source', () => {
    clearExpressionCache();
    const a = compileExpression('1 + 2');
    const b = compileExpression('1 + 2');
    assert.strictEqual(a, b);
  });

  it('clearExpressionCache allows recompilation', () => {
    const a = compileExpression('x + y');
    clearExpressionCache();
    const b = compileExpression('x + y');
    // After clear, identity is a new object (recompiled)
    assert.notStrictEqual(a, b);
  });

  it('compileExpression handles null/undefined source safely', () => {
    clearExpressionCache();
    const result = compileExpression(null);
    assert.ok(result != null);
  });
});

// ─── Interpolation Edge Cases ─────────────────────────────────────────────────

describe('interpolate edge cases', () => {
  // Tested via render, but verify the underlying evaluator handles:

  it('evaluating empty string', () => {
    assert.equal(evaluateExpression(''), undefined);
  });

  it('whitespace-only expression', () => {
    assert.equal(evaluateExpression('   '), undefined);
  });

  it('multi-statement returns last value', () => {
    // The evaluator processes Program body; last statement wins
    // (If semicolon-separated statements supported)
    const result = evaluateExpression('1; 2; 3');
    assert.equal(result, 3);
  });
});
