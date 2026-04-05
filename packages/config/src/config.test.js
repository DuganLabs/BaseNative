import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvFile, loadEnv } from './env.js';
import { string, number, boolean, oneOf, optional, validateConfig, zodAdapter } from './schema.js';
import { defineConfig } from './index.js';

describe('parseEnvFile', () => {
  it('parses simple key=value pairs', () => {
    const result = parseEnvFile('FOO=bar\nBAZ=qux');
    assert.deepEqual(result, { FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores comments and empty lines', () => {
    const result = parseEnvFile('# comment\n\nFOO=bar\n  # another');
    assert.deepEqual(result, { FOO: 'bar' });
  });

  it('handles double-quoted values', () => {
    const result = parseEnvFile('FOO="hello world"');
    assert.deepEqual(result, { FOO: 'hello world' });
  });

  it('handles single-quoted values', () => {
    const result = parseEnvFile("FOO='hello world'");
    assert.deepEqual(result, { FOO: 'hello world' });
  });

  it('strips inline comments for unquoted values', () => {
    const result = parseEnvFile('FOO=bar # comment');
    assert.deepEqual(result, { FOO: 'bar' });
  });

  it('skips lines without equals', () => {
    const result = parseEnvFile('INVALID_LINE\nFOO=bar');
    assert.deepEqual(result, { FOO: 'bar' });
  });
});

describe('schema validators', () => {
  it('string validator accepts strings', () => {
    const v = string();
    assert.deepEqual(v('hello'), { value: 'hello' });
  });

  it('string validator rejects non-strings', () => {
    const v = string();
    assert.ok(v(123).error);
  });

  it('string minLength', () => {
    const v = string({ minLength: 3 });
    assert.ok(v('ab').error);
    assert.deepEqual(v('abc'), { value: 'abc' });
  });

  it('number validator parses numbers', () => {
    const v = number();
    assert.deepEqual(v('42'), { value: 42 });
  });

  it('number validator rejects non-numbers', () => {
    const v = number();
    assert.ok(v('abc').error);
  });

  it('number min/max', () => {
    const v = number({ min: 1, max: 10 });
    assert.ok(v('0').error);
    assert.ok(v('11').error);
    assert.deepEqual(v('5'), { value: 5 });
  });

  it('boolean validator', () => {
    const v = boolean();
    assert.deepEqual(v('true'), { value: true });
    assert.deepEqual(v('false'), { value: false });
    assert.deepEqual(v('1'), { value: true });
    assert.deepEqual(v('0'), { value: false });
    assert.ok(v('maybe').error);
  });

  it('oneOf validator', () => {
    const v = oneOf(['dev', 'staging', 'prod']);
    assert.deepEqual(v('dev'), { value: 'dev' });
    assert.ok(v('other').error);
  });

  it('optional with default', () => {
    const v = optional(number(), 3000);
    assert.deepEqual(v(undefined), { value: 3000 });
    assert.deepEqual(v(''), { value: 3000 });
    assert.deepEqual(v('8080'), { value: 8080 });
  });
});

describe('validateConfig', () => {
  it('validates a complete config', () => {
    const schema = {
      PORT: optional(number({ min: 1, max: 65535 }), 3000),
      HOST: optional(string(), 'localhost'),
      DEBUG: optional(boolean(), false),
    };
    const result = validateConfig({ PORT: '8080', HOST: '0.0.0.0' }, schema);
    assert.deepEqual(result, { PORT: 8080, HOST: '0.0.0.0', DEBUG: false });
  });

  it('throws on validation errors', () => {
    const schema = { PORT: number() };
    assert.throws(() => validateConfig({ PORT: 'abc' }, schema), /Config validation failed/);
  });
});

describe('defineConfig', () => {
  it('loads config from env object', () => {
    const config = defineConfig({
      schema: {
        PORT: optional(number(), 3000),
        NODE_ENV: optional(oneOf(['development', 'production', 'test']), 'development'),
      },
      env: { PORT: '8080', NODE_ENV: 'production' },
    });
    assert.deepEqual(config, { PORT: 8080, NODE_ENV: 'production' });
  });

  it('supports prefix', () => {
    const config = defineConfig({
      schema: {
        port: optional(number(), 3000),
        host: optional(string(), 'localhost'),
      },
      env: { APP_PORT: '9090', APP_HOST: '0.0.0.0' },
      prefix: 'APP_',
    });
    assert.deepEqual(config, { port: 9090, host: '0.0.0.0' });
  });

  it('supports function schema (zodAdapter pattern)', () => {
    const mockZodAdapter = (values) => ({
      port: Number(values.PORT || 3000),
      host: values.HOST || 'localhost',
    });
    const config = defineConfig({
      schema: mockZodAdapter,
      env: { PORT: '4000', HOST: '127.0.0.1' },
    });
    assert.deepEqual(config, { port: 4000, host: '127.0.0.1' });
  });

  it('uses process.env by default when no env provided', () => {
    process.env.__BN_TEST_PORT__ = '7070';
    const config = defineConfig({
      schema: { __BN_TEST_PORT__: optional(number(), 3000) },
    });
    assert.equal(config.__BN_TEST_PORT__, 7070);
    delete process.env.__BN_TEST_PORT__;
  });

  it('prefix with function schema strips prefix and lowercases keys', () => {
    const adapter = (values) => ({ port: Number(values.port || 0) });
    const config = defineConfig({
      schema: adapter,
      env: { SVC_PORT: '9000' },
      prefix: 'SVC_',
    });
    assert.equal(config.port, 9000);
  });
});

describe('parseEnvFile — additional edge cases', () => {
  it('handles CRLF line endings', () => {
    const result = parseEnvFile('FOO=bar\r\nBAZ=qux\r\n');
    assert.deepEqual(result, { FOO: 'bar', BAZ: 'qux' });
  });

  it('handles empty file', () => {
    const result = parseEnvFile('');
    assert.deepEqual(result, {});
  });

  it('handles file with only comments', () => {
    const result = parseEnvFile('# just a comment\n# another');
    assert.deepEqual(result, {});
  });

  it('preserves spaces inside quoted values', () => {
    const result = parseEnvFile('MSG="  spaced  "');
    assert.deepEqual(result, { MSG: '  spaced  ' });
  });

  it('handles value containing equals sign', () => {
    const result = parseEnvFile('URL=postgres://user:pass@host/db?ssl=true');
    assert.equal(result.URL, 'postgres://user:pass@host/db?ssl=true');
  });
});

describe('schema validators — additional edge cases', () => {
  it('string maxLength rejects too-long value', () => {
    const v = string({ maxLength: 5 });
    assert.ok(v('toolong').error);
    assert.deepEqual(v('ok').value, 'ok');
  });

  it('string accepts empty string when no minLength', () => {
    const v = string();
    assert.deepEqual(v(''), { value: '' });
  });

  it('number parses float', () => {
    const v = number();
    assert.equal(v('3.14').value, 3.14);
  });

  it('number allows negative values', () => {
    const v = number({ min: -100, max: 0 });
    assert.equal(v('-50').value, -50);
  });

  it('boolean accepts actual boolean true/false', () => {
    const v = boolean();
    assert.deepEqual(v(true), { value: true });
    assert.deepEqual(v(false), { value: false });
  });

  it('oneOf is case-sensitive', () => {
    const v = oneOf(['dev', 'prod']);
    assert.ok(v('DEV').error);
    assert.deepEqual(v('dev'), { value: 'dev' });
  });

  it('optional with null falls back to default', () => {
    const v = optional(string(), 'default');
    assert.deepEqual(v(null), { value: 'default' });
  });

  it('optional with empty string falls back to default', () => {
    const v = optional(boolean(), true);
    assert.deepEqual(v(''), { value: true });
  });

  it('optional propagates inner validation errors for provided values', () => {
    const v = optional(number({ min: 1 }), 5);
    const result = v('0'); // provided but fails min check
    assert.ok(result.error);
  });
});

describe('validateConfig — additional edge cases', () => {
  it('collects all errors before throwing', () => {
    const schema = { PORT: number(), HOST: number() };
    try {
      validateConfig({ PORT: 'abc', HOST: 'localhost' }, schema);
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('PORT'));
      assert.ok(err.message.includes('HOST'));
    }
  });

  it('returns empty object for empty schema', () => {
    const result = validateConfig({}, {});
    assert.deepEqual(result, {});
  });

  it('error message mentions Config validation failed', () => {
    const schema = { KEY: string({ minLength: 10 }) };
    assert.throws(() => validateConfig({ KEY: 'short' }, schema), /Config validation failed/);
  });
});
