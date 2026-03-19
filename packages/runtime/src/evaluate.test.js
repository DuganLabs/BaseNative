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
