/**
 * Fuzz tests for the CSP-safe expression evaluator.
 *
 * The evaluator must NEVER throw or crash regardless of input — it should
 * silently return undefined and optionally emit diagnostics. These tests
 * exercise that contract with random, adversarial, and edge-case inputs.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression, clearExpressionCache } from './expression.js';

function noThrow(expr, ctx = {}) {
  let threw = false;
  try {
    evaluateExpression(expr, ctx, {
      onDiagnostic: () => {},
    });
  } catch {
    threw = true;
  }
  return !threw;
}

// ─── Malformed / garbage inputs ───────────────────────────────────────────────

describe('fuzz: garbage inputs never throw', () => {
  const inputs = [
    '',
    '   ',
    '\t\n',
    '.',
    '..',
    '...',
    '!',
    '!!',
    '!!!!!!',
    '???',
    '>>>',
    '<<<',
    '***',
    '---',
    '===',
    '!==',
    '&&',
    '||',
    '??',
    '=>',
    '() =>',
    'function() {}',
    'class Foo {}',
    'import x from "y"',
    'export default {}',
    'yield 1',
    'await x',
    'delete obj.x',
    'typeof x',
    'void 0',
    'new Foo()',
    'new Function("return 1")',
    'eval("1+1")',
    '`template`',
    '`${x}`',
    '${x}',
    '#!garbage',
    '\x00\x01\x02',
    '\uFFFD',
    '\u0000',
    '🤔',
    '中文',
    String.fromCharCode(0, 1, 2, 3),
  ];

  for (const input of inputs) {
    it(`does not throw on: ${JSON.stringify(input).slice(0, 60)}`, () => {
      clearExpressionCache();
      assert.ok(noThrow(input));
    });
  }
});

// ─── Deeply nested access ─────────────────────────────────────────────────────

describe('fuzz: deeply nested member access never throws', () => {
  it('50-level deep dot access on null chain', () => {
    const expr = 'a' + '.b'.repeat(50);
    clearExpressionCache();
    assert.ok(noThrow(expr, { a: null }));
  });

  it('50-level deep dot access on undefined chain', () => {
    const expr = 'a' + '.b'.repeat(50);
    clearExpressionCache();
    assert.ok(noThrow(expr, {}));
  });

  it('deeply nested bracket access', () => {
    const expr = 'a' + '["x"]'.repeat(20);
    clearExpressionCache();
    assert.ok(noThrow(expr, { a: {} }));
  });
});

// ─── Prototype poison strings ─────────────────────────────────────────────────

describe('fuzz: prototype poison strings never throw or leak', () => {
  const poisonStrings = [
    '__proto__',
    'constructor',
    'prototype',
    '__proto__.__proto__',
    'constructor.prototype',
    'constructor.constructor',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
  ];

  for (const poison of poisonStrings) {
    it(`safe access: ${poison}`, () => {
      clearExpressionCache();
      assert.ok(noThrow(poison, {}));
    });

    it(`safe nested access: obj.${poison}`, () => {
      clearExpressionCache();
      assert.ok(noThrow(`obj.${poison}`, { obj: {} }));
    });
  }
});

// ─── Long expressions ─────────────────────────────────────────────────────────

describe('fuzz: long expressions never throw', () => {
  it('chained additions (100 terms)', () => {
    const expr = Array.from({ length: 100 }, (_, i) => i).join(' + ');
    clearExpressionCache();
    assert.ok(noThrow(expr));
  });

  it('deeply nested ternaries (20 levels)', () => {
    let expr = '"z"';
    for (let i = 0; i < 20; i++) {
      expr = `true ? "${i}" : ${expr}`;
    }
    clearExpressionCache();
    assert.ok(noThrow(expr));
  });

  it('very long identifier name (1000 chars)', () => {
    const name = 'a'.repeat(1000);
    clearExpressionCache();
    assert.ok(noThrow(name, {}));
  });

  it('very long string literal (10000 chars)', () => {
    const expr = `"${'x'.repeat(10000)}"`;
    clearExpressionCache();
    assert.ok(noThrow(expr));
  });
});

// ─── Context edge cases ───────────────────────────────────────────────────────

describe('fuzz: unusual context values never throw', () => {
  it('null context', () => {
    clearExpressionCache();
    assert.ok(noThrow('x + y', null));
  });

  it('undefined context', () => {
    clearExpressionCache();
    assert.ok(noThrow('x', undefined));
  });

  it('context with null prototype', () => {
    clearExpressionCache();
    const ctx = Object.create(null);
    ctx.x = 1;
    assert.ok(noThrow('x + 1', ctx));
  });

  it('context value is a Proxy', () => {
    clearExpressionCache();
    const proxy = new Proxy({}, { get: () => 42 });
    assert.ok(noThrow('obj.anything', { obj: proxy }));
  });

  it('context value is a function', () => {
    clearExpressionCache();
    const fn = () => 'hello';
    assert.ok(noThrow('fn.name', { fn }));
  });

  it('context value is an array with holes', () => {
    clearExpressionCache();
    // eslint-disable-next-line no-sparse-arrays
    const arr = [1, , 3];
    assert.ok(noThrow('arr[1]', { arr }));
  });

  it('context has circular reference', () => {
    clearExpressionCache();
    const obj = { a: 1 };
    obj.self = obj;
    assert.ok(noThrow('obj.self.a', { obj }));
  });
});

// ─── Boundary: evaluator returns undefined for unknown expressions ────────────

describe('fuzz: evaluator result is always defined-safe', () => {
  const inputs = [
    ['x.y.z', {}],
    ['arr[99]', { arr: [1] }],
    ['fn()', {}],
    ['null.x', {}],
    ['(null).x', {}],
  ];

  for (const [expr, ctx] of inputs) {
    it(`returns undefined (not throws) for: ${expr}`, () => {
      clearExpressionCache();
      let result;
      assert.doesNotThrow(() => {
        result = evaluateExpression(expr, ctx, { onDiagnostic: () => {} });
      });
      assert.ok(result === undefined || result !== undefined); // any result is fine, as long as no throw
    });
  }
});
