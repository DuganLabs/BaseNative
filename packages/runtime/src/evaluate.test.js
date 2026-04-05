import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, interpolate } from './evaluate.js';
import { clearExpressionCache } from '../../../src/shared/expression.js';

describe('evaluate', () => {
  it('supports a safe expression subset without eval-like APIs', () => {
    const count = () => 2;
    count.set = (value) => value;

    assert.equal(evaluate('count() + 3', { count }), 5);
    assert.equal(evaluate('count.set(count() + 1)', { count }), 3);
    assert.equal(
      evaluate(`enabled ? label + ' ready' : 'disabled'`, {
        enabled: true,
        label: 'Server',
      }),
      'Server ready'
    );
  });

  it('blocks unsafe property access', () => {
    clearExpressionCache();
    const diagnostics = [];
    const result = evaluate('tool.constructor', { tool: {} }, {
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic);
      },
    });

    assert.equal(result, undefined);
    assert.equal(diagnostics[0].code, 'BN_EXPR_UNSAFE_MEMBER');
  });

  it('interpolates multiple expressions', () => {
    const result = interpolate('Hello {{ name }} ({{ count }})', {
      name: 'BaseNative',
      count: 3,
    });

    assert.equal(result, 'Hello BaseNative (3)');
  });
});

describe('evaluate — additional', () => {
  it('evaluates boolean literals', () => {
    assert.equal(evaluate('true', {}), true);
    assert.equal(evaluate('false', {}), false);
  });

  it('evaluates null literal', () => {
    assert.equal(evaluate('null', {}), null);
  });

  it('evaluates numeric arithmetic', () => {
    assert.equal(evaluate('2 * 3 + 1', {}), 7);
    assert.equal(evaluate('10 / 2', {}), 5);
    assert.equal(evaluate('7 % 3', {}), 1);
  });

  it('evaluates string concatenation', () => {
    assert.equal(evaluate('"hello" + " " + "world"', {}), 'hello world');
  });

  it('evaluates comparison operators', () => {
    assert.equal(evaluate('5 > 3', {}), true);
    assert.equal(evaluate('2 >= 2', {}), true);
    assert.equal(evaluate('1 < 0', {}), false);
    assert.equal(evaluate('3 === 3', {}), true);
    assert.equal(evaluate('3 !== 4', {}), true);
  });

  it('evaluates logical operators', () => {
    assert.equal(evaluate('true && false', {}), false);
    assert.equal(evaluate('true || false', {}), true);
    assert.equal(evaluate('!true', {}), false);
  });

  it('evaluates nested ternary', () => {
    const result = evaluate('x > 10 ? "big" : x > 5 ? "medium" : "small"', { x: 6 });
    assert.equal(result, 'medium');
  });

  it('evaluates array literal', () => {
    const arr = evaluate('[1, 2, 3]', {});
    assert.deepEqual(arr, [1, 2, 3]);
  });

  it('evaluates array indexing', () => {
    assert.equal(evaluate('items[0]', { items: ['a', 'b', 'c'] }), 'a');
    assert.equal(evaluate('items[2]', { items: ['a', 'b', 'c'] }), 'c');
  });

  it('evaluates deep property access', () => {
    assert.equal(evaluate('user.address.city', { user: { address: { city: 'Portland' } } }), 'Portland');
  });

  it('returns undefined for unknown identifier', () => {
    const result = evaluate('unknownVar', {});
    assert.equal(result, undefined);
  });
});

describe('interpolate — additional', () => {
  it('returns plain text unchanged', () => {
    assert.equal(interpolate('Hello World', {}), 'Hello World');
  });

  it('replaces null/undefined expression with empty string', () => {
    assert.equal(interpolate('Value: {{ missing }}', {}), 'Value: ');
  });

  it('handles consecutive expressions', () => {
    assert.equal(interpolate('{{ a }}{{ b }}', { a: 'foo', b: 'bar' }), 'foobar');
  });

  it('interpolates numeric values as strings', () => {
    assert.equal(interpolate('Count: {{ n }}', { n: 99 }), 'Count: 99');
  });
});
