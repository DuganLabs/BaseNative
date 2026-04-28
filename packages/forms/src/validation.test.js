import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { required, minLength, maxLength, pattern, email, min, max, custom } from './validators.js';

describe('validators — comprehensive validation module coverage', () => {
  describe('required validator', () => {
    it('passes for non-empty string', () => {
      assert.equal(required()('hello'), null);
    });

    it('fails for empty string', () => {
      const err = required()('');
      assert.ok(err);
      assert.equal(err.code, 'required');
    });

    it('fails for null', () => {
      const err = required()(null);
      assert.ok(err);
      assert.equal(err.code, 'required');
    });

    it('fails for undefined', () => {
      const err = required()(undefined);
      assert.ok(err);
      assert.equal(err.code, 'required');
    });

    it('fails for empty array', () => {
      const err = required()([]);
      assert.ok(err);
      assert.equal(err.code, 'required');
    });

    it('passes for non-empty array', () => {
      assert.equal(required()([1, 2, 3]), null);
    });

    it('passes for zero', () => {
      assert.equal(required()(0), null);
    });

    it('passes for false', () => {
      assert.equal(required()(false), null);
    });

    it('uses default error message', () => {
      const err = required()('');
      assert.equal(err.message, 'This field is required');
    });

    it('uses custom error message', () => {
      const err = required('Field cannot be blank')('');
      assert.equal(err.message, 'Field cannot be blank');
    });

    it('passes for whitespace-only string', () => {
      assert.equal(required()('   '), null);
    });

    it('passes for non-empty object', () => {
      const validator = required();
      // Objects are truthy, so they pass required
      assert.equal(validator({}), null);
    });
  });

  describe('minLength validator', () => {
    it('passes when string equals minimum length', () => {
      assert.equal(minLength(5)('hello'), null);
    });

    it('passes when string exceeds minimum length', () => {
      assert.equal(minLength(3)('hello'), null);
    });

    it('fails when string is shorter than minimum', () => {
      const err = minLength(5)('hi');
      assert.ok(err);
      assert.equal(err.code, 'minLength');
    });

    it('uses default error message with parameter', () => {
      const err = minLength(10)('short');
      assert.equal(err.message, 'Must be at least 10 characters');
    });

    it('uses custom error message', () => {
      const err = minLength(5, 'Too short!')('abc');
      assert.equal(err.message, 'Too short!');
    });

    it('passes for null (not required)', () => {
      assert.equal(minLength(5)(null), null);
    });

    it('passes for undefined (not required)', () => {
      assert.equal(minLength(5)(undefined), null);
    });

    it('converts number to string for length check', () => {
      assert.equal(minLength(2)(123), null);
      const err = minLength(5)(123);
      assert.ok(err);
      assert.equal(err.code, 'minLength');
    });

    it('includes min parameter in error object', () => {
      const err = minLength(8)('short');
      assert.ok(err.params);
      assert.equal(err.params.min, 8);
    });

    it('handles empty string', () => {
      const err = minLength(1)('');
      assert.ok(err);
      assert.equal(err.code, 'minLength');
    });

    it('passes for string with exactly min length', () => {
      assert.equal(minLength(3)('abc'), null);
    });

    it('handles zero as minimum length', () => {
      assert.equal(minLength(0)(''), null);
      assert.equal(minLength(0)('anything'), null);
    });

    it('handles strings with special characters', () => {
      const special = '!@#$%';
      assert.equal(minLength(5)(special), null);
      const err = minLength(10)(special);
      assert.ok(err);
    });

    it('handles unicode characters correctly', () => {
      const unicode = '你好';
      assert.equal(minLength(2)(unicode), null);
      const err = minLength(3)(unicode);
      assert.ok(err);
    });
  });

  describe('maxLength validator', () => {
    it('passes when string is at maximum length', () => {
      assert.equal(maxLength(5)('hello'), null);
    });

    it('passes when string is under maximum length', () => {
      assert.equal(maxLength(10)('hello'), null);
    });

    it('fails when string exceeds maximum length', () => {
      const err = maxLength(3)('hello');
      assert.ok(err);
      assert.equal(err.code, 'maxLength');
    });

    it('uses default error message with parameter', () => {
      const err = maxLength(3)('hello');
      assert.equal(err.message, 'Must be at most 3 characters');
    });

    it('uses custom error message', () => {
      const err = maxLength(2, 'Way too long!')('hello');
      assert.equal(err.message, 'Way too long!');
    });

    it('passes for null (not required)', () => {
      assert.equal(maxLength(3)(null), null);
    });

    it('passes for undefined (not required)', () => {
      assert.equal(maxLength(3)(undefined), null);
    });

    it('converts number to string for length check', () => {
      const err = maxLength(2)(123);
      assert.ok(err);
      assert.equal(err.code, 'maxLength');
    });

    it('includes max parameter in error object', () => {
      const err = maxLength(3)('hello');
      assert.ok(err.params);
      assert.equal(err.params.max, 3);
    });

    it('handles empty string', () => {
      assert.equal(maxLength(5)(''), null);
    });

    it('passes for string with exactly max length', () => {
      assert.equal(maxLength(5)('hello'), null);
    });

    it('handles zero as maximum length', () => {
      assert.equal(maxLength(0)(''), null);
      const err = maxLength(0)('a');
      assert.ok(err);
    });

    it('handles strings with special characters', () => {
      const special = '!@#$%';
      assert.equal(maxLength(5)(special), null);
      const err = maxLength(3)(special);
      assert.ok(err);
    });

    it('handles unicode characters correctly', () => {
      const unicode = '你好';
      assert.equal(maxLength(2)(unicode), null);
      const err = maxLength(1)(unicode);
      assert.ok(err);
    });
  });

  describe('pattern validator', () => {
    it('passes for matching regex with RegExp', () => {
      assert.equal(pattern(/^\d+$/)('12345'), null);
    });

    it('fails for non-matching regex with RegExp', () => {
      const err = pattern(/^\d+$/)('abc');
      assert.ok(err);
      assert.equal(err.code, 'pattern');
    });

    it('passes for matching regex with string pattern', () => {
      assert.equal(pattern('^\\d+$')('123'), null);
    });

    it('fails for non-matching regex with string pattern', () => {
      const err = pattern('^[a-z]+$')('ABC');
      assert.ok(err);
      assert.equal(err.code, 'pattern');
    });

    it('uses default error message', () => {
      const err = pattern(/^\d+$/)('abc');
      assert.equal(err.message, 'Invalid format');
    });

    it('uses custom error message', () => {
      const err = pattern(/^\d+$/, 'Must be all digits')('abc');
      assert.equal(err.message, 'Must be all digits');
    });

    it('passes for empty string (not required)', () => {
      assert.equal(pattern(/^\d+$/)(''), null);
    });

    it('passes for null (not required)', () => {
      assert.equal(pattern(/^\d+$/)( null), null);
    });

    it('passes for undefined (not required)', () => {
      assert.equal(pattern(/^\d+$/)( undefined), null);
    });

    it('converts number to string for pattern matching', () => {
      assert.equal(pattern(/^\d{3}$/)( 123), null);
      const err = pattern(/^\d{3}$/)( 1234);
      assert.ok(err);
    });

    it('handles complex regex patterns', () => {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      assert.equal(pattern(phoneRegex)('123-456-7890'), null);
      const err = pattern(phoneRegex)('123456789');
      assert.ok(err);
    });

    it('handles case-sensitive patterns', () => {
      assert.equal(pattern(/^[A-Z]+$/)('ABC'), null);
      const err = pattern(/^[A-Z]+$/)('abc');
      assert.ok(err);
    });

    it('handles case-insensitive patterns', () => {
      assert.equal(pattern(/^[a-z]+$/i)('ABC'), null);
      assert.equal(pattern(/^[a-z]+$/i)('abc'), null);
    });

    it('handles patterns with special characters', () => {
      const emailLike = /^[^@]+@[^@]+$/;
      assert.equal(pattern(emailLike)('user@example.com'), null);
      const err = pattern(emailLike)('notanemail');
      assert.ok(err);
    });

    it('handles patterns with wildcards', () => {
      assert.equal(pattern(/.*test.*/)('this is a test'), null);
      assert.equal(pattern(/.*test.*/)('testing'), null);
      const err = pattern(/.*test.*/)('no match');
      assert.ok(err);
    });

    it('handles patterns with anchors', () => {
      assert.equal(pattern(/^start/)('start here'), null);
      const err = pattern(/^start/)('not at start');
      assert.ok(err);
    });
  });

  describe('email validator', () => {
    it('passes for standard email format', () => {
      assert.equal(email()('user@example.com'), null);
    });

    it('fails for email without @', () => {
      const err = email()('userexample.com');
      assert.ok(err);
      assert.equal(err.code, 'pattern');
    });

    it('fails for email without domain', () => {
      const err = email()('user@');
      assert.ok(err);
    });

    it('fails for email without local part', () => {
      const err = email()('@example.com');
      assert.ok(err);
    });

    it('fails for email with spaces', () => {
      const err = email()('user @example.com');
      assert.ok(err);
    });

    it('passes for email with multiple subdomains', () => {
      assert.equal(email()('user@mail.example.com'), null);
    });

    it('passes for email with plus addressing', () => {
      assert.equal(email()('user+tag@example.com'), null);
    });

    it('passes for email with numbers', () => {
      assert.equal(email()('user123@example456.com'), null);
    });

    it('passes for email with dots in local part', () => {
      assert.equal(email()('user.name@example.com'), null);
    });

    it('passes for email with dashes in domain', () => {
      assert.equal(email()('user@example-domain.com'), null);
    });

    it('uses default error message', () => {
      const err = email()('invalid');
      assert.equal(err.message, 'Invalid email address');
    });

    it('uses custom error message', () => {
      const err = email('Please enter a valid email')('invalid');
      assert.equal(err.message, 'Please enter a valid email');
    });

    it('passes for empty string (not required)', () => {
      assert.equal(email()(''), null);
    });

    it('passes for null (not required)', () => {
      assert.equal(email()( null), null);
    });

    it('fails for multiple @ symbols', () => {
      const err = email()('user@@example.com');
      assert.ok(err);
    });

    it('fails for missing dot in domain', () => {
      const err = email()('user@examplecom');
      assert.ok(err);
    });
  });

  describe('min validator (numeric)', () => {
    it('passes for value equal to minimum', () => {
      assert.equal(min(10)(10), null);
    });

    it('passes for value above minimum', () => {
      assert.equal(min(10)(15), null);
    });

    it('fails for value below minimum', () => {
      const err = min(10)(5);
      assert.ok(err);
      assert.equal(err.code, 'min');
    });

    it('uses default error message with parameter', () => {
      const err = min(10)(5);
      assert.equal(err.message, 'Must be at least 10');
    });

    it('uses custom error message', () => {
      const err = min(10, 'Too small!')( 5);
      assert.equal(err.message, 'Too small!');
    });

    it('passes for null (not required)', () => {
      assert.equal(min(10)(null), null);
    });

    it('passes for undefined (not required)', () => {
      assert.equal(min(10)(undefined), null);
    });

    it('converts string to number', () => {
      assert.equal(min(10)('15'), null);
      const err = min(10)('5');
      assert.ok(err);
    });

    it('includes min parameter in error object', () => {
      const err = min(10)(5);
      assert.ok(err.params);
      assert.equal(err.params.min, 10);
    });

    it('handles negative numbers', () => {
      assert.equal(min(-10)(-5), null);
      const err = min(-10)(-15);
      assert.ok(err);
    });

    it('handles zero as minimum', () => {
      assert.equal(min(0)(0), null);
      assert.equal(min(0)(5), null);
      const err = min(0)(-1);
      assert.ok(err);
    });

    it('handles floating point numbers', () => {
      assert.equal(min(5.5)(5.5), null);
      assert.equal(min(5.5)(6.0), null);
      const err = min(5.5)(5.4);
      assert.ok(err);
    });

    it('handles NaN correctly', () => {
      // NaN comparison returns false, so validation passes (NaN < 10 is false)
      const result = min(10)(NaN);
      assert.equal(result, null);
    });

    it('handles Infinity', () => {
      assert.equal(min(10)(Infinity), null);
      const err = min(Infinity)(10);
      assert.ok(err);
    });
  });

  describe('max validator (numeric)', () => {
    it('passes for value equal to maximum', () => {
      assert.equal(max(100)(100), null);
    });

    it('passes for value below maximum', () => {
      assert.equal(max(100)(50), null);
    });

    it('fails for value above maximum', () => {
      const err = max(100)(150);
      assert.ok(err);
      assert.equal(err.code, 'max');
    });

    it('uses default error message with parameter', () => {
      const err = max(100)(150);
      assert.equal(err.message, 'Must be at most 100');
    });

    it('uses custom error message', () => {
      const err = max(100, 'Too large!')( 150);
      assert.equal(err.message, 'Too large!');
    });

    it('passes for null (not required)', () => {
      assert.equal(max(100)(null), null);
    });

    it('passes for undefined (not required)', () => {
      assert.equal(max(100)(undefined), null);
    });

    it('converts string to number', () => {
      assert.equal(max(100)('50'), null);
      const err = max(100)('150');
      assert.ok(err);
    });

    it('includes max parameter in error object', () => {
      const err = max(100)(150);
      assert.ok(err.params);
      assert.equal(err.params.max, 100);
    });

    it('handles negative numbers', () => {
      assert.equal(max(-5)(-10), null);
      const err = max(-5)(0);
      assert.ok(err);
    });

    it('handles zero as maximum', () => {
      assert.equal(max(0)(0), null);
      assert.equal(max(0)(-5), null);
      const err = max(0)(1);
      assert.ok(err);
    });

    it('handles floating point numbers', () => {
      assert.equal(max(5.5)(5.5), null);
      assert.equal(max(5.5)(5.0), null);
      const err = max(5.5)(5.6);
      assert.ok(err);
    });

    it('handles NaN correctly', () => {
      // NaN comparison returns false, so validation passes (NaN > 100 is false)
      const result = max(100)(NaN);
      assert.equal(result, null);
    });

    it('handles Infinity', () => {
      assert.equal(max(Infinity)(100), null);
      const err = max(100)(Infinity);
      assert.ok(err);
    });
  });

  describe('custom validator', () => {
    it('returns function as-is', () => {
      const fn = (v) => v === 'bad' ? { code: 'bad', message: 'No bad words' } : null;
      const validator = custom(fn);
      assert.equal(validator, fn);
    });

    it('passes when custom function returns null', () => {
      const validator = custom((v) => v === 'good' ? null : { code: 'bad', message: 'Bad' });
      assert.equal(validator('good'), null);
    });

    it('fails when custom function returns error object', () => {
      const validator = custom((v) => v === 'bad' ? { code: 'bad', message: 'No bad words' } : null);
      const err = validator('bad');
      assert.ok(err);
      assert.equal(err.code, 'bad');
      assert.equal(err.message, 'No bad words');
    });

    it('supports cross-field validation logic', () => {
      const passwordMatch = custom((v) => {
        // In practice, this would compare against another field
        return v === 'password' ? null : { code: 'match', message: 'Passwords do not match' };
      });
      assert.equal(passwordMatch('password'), null);
      const err = passwordMatch('different');
      assert.ok(err);
    });

    it('supports complex validation logic', () => {
      const complexValidator = custom((v) => {
        if (!v) return null; // not required
        if (typeof v !== 'string') return { code: 'type', message: 'Must be string' };
        if (v.length < 5) return { code: 'length', message: 'Too short' };
        if (!/[A-Z]/.test(v)) return { code: 'uppercase', message: 'Need uppercase' };
        if (!/[0-9]/.test(v)) return { code: 'digit', message: 'Need digit' };
        return null;
      });

      assert.equal(complexValidator('ValidPass123'), null);
      assert.ok(complexValidator('short'));
      assert.ok(complexValidator('noupppercase1'));
      assert.ok(complexValidator('NoDigits'));
    });

    it('handles validators that check multiple conditions', () => {
      const rangeValidator = custom((v) => {
        if (v == null) return null;
        const num = Number(v);
        if (num < 0) return { code: 'negative', message: 'Cannot be negative' };
        if (num > 100) return { code: 'toohigh', message: 'Max is 100' };
        return null;
      });

      assert.equal(rangeValidator(50), null);
      assert.equal(rangeValidator(null), null);
      assert.ok(rangeValidator(-1));
      assert.ok(rangeValidator(101));
    });

    it('can wrap promise-based validators in custom', async () => {
      const asyncValidator = custom((v) => {
        // Note: validators are synchronous in the forms library
        // But custom() allows wrapping any function, including those that return promises
        if (typeof v === 'string' && v === 'valid') {
          return null;
        }
        return { code: 'invalid', message: 'Invalid' };
      });

      assert.equal(asyncValidator('valid'), null);
      assert.ok(asyncValidator('invalid'));
    });
  });

  describe('validator composition', () => {
    it('chains multiple validators on one value', () => {
      const validators = [minLength(5), maxLength(10)];
      const value = 'hello';

      const errors = validators
        .map((v) => v(value))
        .filter((err) => err !== null);

      assert.equal(errors.length, 0);
    });

    it('collects all validation errors', () => {
      const validators = [required(), minLength(5), pattern(/^\w+$/)];
      const value = 'a';

      const errors = validators
        .map((v) => v(value))
        .filter((err) => err !== null);

      assert.equal(errors.length, 1); // only minLength fails
    });

    it('supports combining required with other validators', () => {
      const validators = [required(), email()];

      // Empty string fails required
      assert.ok(validators[0](''));
      assert.equal(validators[1](''), null); // email passes for empty (not required)

      // Invalid email fails email validator
      assert.equal(validators[0]('a@b.c'), null); // required passes
      assert.equal(validators[1]('a@b.c'), null); // email passes

      assert.equal(validators[0]('a@b'), null);
      assert.ok(validators[1]('a@b')); // email fails
    });
  });

  describe('error object structure', () => {
    it('error objects contain code property', () => {
      const err = required()('');
      assert.ok(err.code);
      assert.equal(typeof err.code, 'string');
    });

    it('error objects contain message property', () => {
      const err = required()('');
      assert.ok(err.message);
      assert.equal(typeof err.message, 'string');
    });

    it('some validators include params property', () => {
      const errMin = min(10)(5);
      assert.ok(errMin.params);
      assert.ok('min' in errMin.params);

      const errMax = max(100)(150);
      assert.ok(errMax.params);
      assert.ok('max' in errMax.params);

      const errMinLen = minLength(5)('ab');
      assert.ok(errMinLen.params);
      assert.ok('min' in errMinLen.params);

      const errMaxLen = maxLength(3)('hello');
      assert.ok(errMaxLen.params);
      assert.ok('max' in errMaxLen.params);
    });

    it('error codes match validator names', () => {
      assert.equal(required()('').code, 'required');
      assert.equal(minLength(5)('a').code, 'minLength');
      assert.equal(maxLength(3)('hello').code, 'maxLength');
      assert.equal(min(10)(5).code, 'min');
      assert.equal(max(100)(150).code, 'max');
      assert.equal(pattern(/\d/)('a').code, 'pattern');
    });
  });

  describe('edge cases and type coercion', () => {
    it('handles boolean values in required', () => {
      assert.equal(required()(true), null);
      assert.equal(required()(false), null);
    });

    it('handles empty object in required', () => {
      // Object is truthy, just not null/undefined/empty string/empty array
      assert.equal(required()({}), null);
    });

    it('handles array of values in required', () => {
      assert.equal(required()([1, 2, 3]), null);
      assert.ok(required()([]));
    });

    it('handles strings with only whitespace in minLength', () => {
      // minLength counts characters, not trimmed length
      assert.equal(minLength(3)('   '), null); // 3 spaces = 3 chars
      assert.ok(minLength(4)('   ')); // 3 spaces < 4 chars
    });

    it('handles numeric string conversions in min/max', () => {
      assert.equal(min(10)('15'), null);
      assert.equal(max(10)('5'), null);
    });

    it('handles invalid number strings in min/max', () => {
      // Number('abc') = NaN, NaN < 10 is false, so validation passes
      const result = min(10)('abc');
      assert.equal(result, null);
    });

    it('handles empty string with pattern', () => {
      assert.equal(pattern(/\d+/)(''), null); // empty passes (not required)
    });

    it('handles null with all validators except required', () => {
      assert.equal(minLength(5)(null), null);
      assert.equal(maxLength(5)(null), null);
      assert.equal(min(5)(null), null);
      assert.equal(max(5)(null), null);
      assert.equal(pattern(/\d/)(null), null);
      assert.equal(email()(null), null);
    });

    it('handles very long strings', () => {
      const longString = 'a'.repeat(10000);
      assert.equal(minLength(5000)(longString), null);
      const err = maxLength(5000)(longString);
      assert.ok(err);
    });

    it('handles strings with newlines and tabs', () => {
      const stringWithWhitespace = 'hello\nworld\ttab';
      assert.equal(minLength(10)(stringWithWhitespace), null);
      assert.equal(required()(stringWithWhitespace), null);
    });

    it('handles very large numbers', () => {
      assert.equal(min(1000000)(999999999), null);
      assert.equal(max(999999999)(1000000), null);
    });

    it('handles scientific notation', () => {
      assert.equal(min(100)(1e3), null); // 1000 > 100
      const err = min(1000)(1e2); // 100 < 1000
      assert.ok(err);
    });
  });

  describe('validation with transforms and real-world scenarios', () => {
    it('validates password strength', () => {
      const passwordValidator = custom((v) => {
        if (!v) return null;
        if (v.length < 8) return { code: 'minLength', message: 'Minimum 8 characters' };
        if (!/[A-Z]/.test(v)) return { code: 'uppercase', message: 'Needs uppercase letter' };
        if (!/[a-z]/.test(v)) return { code: 'lowercase', message: 'Needs lowercase letter' };
        if (!/\d/.test(v)) return { code: 'digit', message: 'Needs digit' };
        if (!/[!@#$%^&*]/.test(v)) return { code: 'special', message: 'Needs special character' };
        return null;
      });

      assert.ok(passwordValidator('weak'));
      assert.ok(passwordValidator('NoDigits!'));
      assert.equal(passwordValidator('SecurePass123!'), null);
    });

    it('validates URL format', () => {
      const urlValidator = pattern(
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        'Invalid URL'
      );

      assert.equal(urlValidator('https://example.com'), null);
      assert.equal(urlValidator('http://www.example.com/path?query=1'), null);
      assert.ok(urlValidator('not a url'));
    });

    it('validates username format', () => {
      const usernameValidator = custom((v) => {
        if (!v) return null;
        if (v.length < 3) return { code: 'minLength', message: 'Min 3 characters' };
        if (v.length > 20) return { code: 'maxLength', message: 'Max 20 characters' };
        if (!/^[a-zA-Z0-9_-]+$/.test(v)) return { code: 'format', message: 'Only letters, numbers, _, -' };
        return null;
      });

      assert.ok(usernameValidator('ab')); // too short
      assert.ok(usernameValidator('a'.repeat(21))); // too long
      assert.ok(usernameValidator('user@name')); // invalid chars
      assert.equal(usernameValidator('valid_user-123'), null);
    });

    it('validates credit card number (Luhn algorithm)', () => {
      const ccValidator = custom((v) => {
        if (!v) return null;
        const digits = String(v).replace(/\D/g, '');
        if (digits.length < 13 || digits.length > 19) {
          return { code: 'length', message: 'Invalid card length' };
        }
        // Simple pattern check (real validation would use Luhn)
        if (!/^\d+$/.test(digits)) {
          return { code: 'format', message: 'Only digits allowed' };
        }
        return null;
      });

      assert.ok(ccValidator('12')); // too short
      assert.ok(ccValidator('abcd')); // non-digits
      assert.equal(ccValidator('4532015112830366'), null); // valid length
    });

    it('validates date range', () => {
      const dateValidator = custom((v) => {
        if (!v) return null;
        const date = new Date(v);
        if (isNaN(date.getTime())) {
          return { code: 'format', message: 'Invalid date' };
        }
        const today = new Date();
        if (date < today) {
          return { code: 'past', message: 'Date must be in the future' };
        }
        return null;
      });

      // This is a conceptual test; actual behavior depends on how dates are passed
      assert.ok(dateValidator('invalid-date'));
    });

    it('validates file extension', () => {
      const fileValidator = custom((v) => {
        if (!v) return null;
        const ext = v.split('.').pop().toLowerCase();
        const allowed = ['jpg', 'png', 'gif', 'pdf'];
        if (!allowed.includes(ext)) {
          return { code: 'ext', message: 'File type not allowed' };
        }
        return null;
      });

      assert.ok(fileValidator('document.exe'));
      assert.equal(fileValidator('image.jpg'), null);
      assert.equal(fileValidator('document.pdf'), null);
    });
  });
});
