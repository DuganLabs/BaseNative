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
});
