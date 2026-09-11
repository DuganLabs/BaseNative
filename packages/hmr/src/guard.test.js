import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertDevOnly, isDevEnvironment } from './guard.js';

describe('isDevEnvironment', () => {
  it('is on when NODE_ENV is unset', () => {
    assert.equal(isDevEnvironment({}), true);
  });

  it('is on in development and test', () => {
    assert.equal(isDevEnvironment({ NODE_ENV: 'development' }), true);
    assert.equal(isDevEnvironment({ NODE_ENV: 'test' }), true);
  });

  it('is off in production', () => {
    assert.equal(isDevEnvironment({ NODE_ENV: 'production' }), false);
    assert.equal(isDevEnvironment({ NODE_ENV: 'Production' }), false);
    assert.equal(isDevEnvironment({ NODE_ENV: ' PRODUCTION ' }), false);
    assert.equal(isDevEnvironment({ NODE_ENV: 'prod' }), false);
  });

  it('has no escape hatch that re-enables production', () => {
    for (const value of ['1', 'on', 'true', 'yes', 'force', 'always']) {
      assert.equal(
        isDevEnvironment({ NODE_ENV: 'production', BN_HMR: value }),
        false,
        `BN_HMR=${value} must not re-enable HMR in production`
      );
    }
  });

  it('BN_HMR can switch HMR off in development', () => {
    for (const value of ['0', 'off', 'false', 'no', 'OFF']) {
      assert.equal(isDevEnvironment({ NODE_ENV: 'development', BN_HMR: value }), false);
    }
  });
});

describe('assertDevOnly', () => {
  it('is silent in development', () => {
    assert.doesNotThrow(() => assertDevOnly('createHmrProxy', { NODE_ENV: 'development' }));
  });

  it('throws an actionable error in production', () => {
    assert.throws(
      () => assertDevOnly('createHmrProxy', { NODE_ENV: 'production' }),
      (error) => {
        assert.match(error.message, /createHmrProxy\(\) refused to start/);
        assert.match(error.message, /NODE_ENV=production/);
        assert.match(error.message, /development-only/);
        return true;
      }
    );
  });
});
