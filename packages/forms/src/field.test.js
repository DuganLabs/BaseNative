import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Minimal signal polyfill for testing without browser globals
import { createField } from './field.js';
import { required, minLength, maxLength, email, min, max, pattern, custom } from './validators.js';

describe('createField', () => {
  it('initializes with the given value', () => {
    const field = createField('hello');
    assert.equal(field.value(), 'hello');
  });

  it('tracks dirty state on setValue', () => {
    const field = createField('');
    assert.equal(field.dirty(), false);
    field.setValue('changed');
    assert.equal(field.dirty(), true);
    assert.equal(field.value(), 'changed');
  });

  it('tracks touched state', () => {
    const field = createField('');
    assert.equal(field.touched(), false);
    field.touch();
    assert.equal(field.touched(), true);
  });

  it('validates with required', () => {
    const field = createField('', { validators: [required()] });
    assert.equal(field.valid(), false);
    assert.equal(field.firstError().code, 'required');

    field.setValue('hello');
    assert.equal(field.valid(), true);
    assert.equal(field.firstError(), null);
  });

  it('validates with minLength', () => {
    const field = createField('ab', { validators: [minLength(3)] });
    assert.equal(field.valid(), false);

    field.setValue('abc');
    assert.equal(field.valid(), true);
  });

  it('validates with email', () => {
    const field = createField('not-email', { validators: [email()] });
    assert.equal(field.valid(), false);

    field.setValue('user@example.com');
    assert.equal(field.valid(), true);
  });

  it('combines multiple validators', () => {
    const field = createField('', { validators: [required(), minLength(3)] });
    assert.equal(field.errors().length, 2);

    field.setValue('ab');
    assert.equal(field.errors().length, 1);

    field.setValue('abc');
    assert.equal(field.errors().length, 0);
  });

  it('resets to initial value', () => {
    const field = createField('initial');
    field.setValue('changed');
    field.touch();
    field.reset();
    assert.equal(field.value(), 'initial');
    assert.equal(field.dirty(), false);
    assert.equal(field.touched(), false);
  });

  it('handles server errors', () => {
    const field = createField('test');
    field.setServerErrors([{ code: 'taken', message: 'Already taken' }]);
    assert.equal(field.valid(), false);
    assert.equal(field.errors().length, 1);

    // Server errors clear on local change
    field.setValue('other');
    assert.equal(field.valid(), true);
  });

  it('applies transform function', () => {
    const field = createField('', { transform: (v) => v.trim().toLowerCase() });
    field.setValue('  HELLO  ');
    assert.equal(field.value(), 'hello');
  });

  it('accepts updater function in setValue', () => {
    const field = createField(1);
    field.setValue((prev) => prev + 1);
    assert.equal(field.value(), 2);
  });
});

describe('validators', () => {
  it('required passes for non-empty string', () => {
    assert.equal(required()('hello'), null);
  });

  it('required fails for null', () => {
    assert.equal(required()(null).code, 'required');
  });

  it('required fails for empty array', () => {
    assert.equal(required()([]).code, 'required');
  });

  it('required uses custom message', () => {
    assert.equal(required('Fill this in')('').message, 'Fill this in');
  });

  it('minLength passes when value is long enough', () => {
    assert.equal(minLength(3)('abc'), null);
  });

  it('minLength fails when value is too short', () => {
    assert.equal(minLength(3)('ab').code, 'minLength');
  });

  it('minLength passes for null (not required)', () => {
    assert.equal(minLength(3)(null), null);
  });

  it('maxLength passes when value is within limit', () => {
    assert.equal(maxLength(5)('hello'), null);
  });

  it('maxLength fails when value is too long', () => {
    assert.equal(maxLength(3)('abcd').code, 'maxLength');
  });

  it('maxLength includes params', () => {
    const err = maxLength(5)('toolong');
    assert.equal(err.params.max, 5);
  });

  it('min passes for value above minimum', () => {
    assert.equal(min(0)(1), null);
  });

  it('min fails for value below minimum', () => {
    assert.equal(min(10)(5).code, 'min');
  });

  it('max passes for value below maximum', () => {
    assert.equal(max(100)(50), null);
  });

  it('max fails for value above maximum', () => {
    assert.equal(max(10)(20).code, 'max');
  });

  it('pattern passes for matching value', () => {
    assert.equal(pattern(/^\d+$/)('123'), null);
  });

  it('pattern fails for non-matching value', () => {
    assert.equal(pattern(/^\d+$/)('abc').code, 'pattern');
  });

  it('pattern skips empty string (not required)', () => {
    assert.equal(pattern(/^\d+$/)(''), null);
  });

  it('custom validator passes through function result', () => {
    const fn = (v) => v === 'bad' ? { code: 'bad', message: 'No bad words' } : null;
    const v = custom(fn);
    assert.equal(v('good'), null);
    assert.equal(v('bad').code, 'bad');
  });
});
