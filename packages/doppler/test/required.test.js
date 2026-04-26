import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  validateRequired,
  loadRequired,
  findMissing,
  ValidationError,
} from '../src/required.js';
import {
  injectIntoWrangler,
  MissingSecretsError,
  requireSecrets,
} from '../src/index.js';

describe('validateRequired', () => {
  it('accepts a minimal valid schema', () => {
    const out = validateRequired({
      secrets: [{ name: 'API_KEY' }],
      configs: ['dev', 'prod'],
    });
    assert.equal(out.secrets[0].name, 'API_KEY');
    assert.equal(out.secrets[0].required, true); // default
    assert.deepEqual(out.configs, ['dev', 'prod']);
  });

  it('preserves description and required:false', () => {
    const out = validateRequired({
      secrets: [
        { name: 'SENTRY_DSN', description: 'Sentry DSN', required: false },
      ],
      configs: ['dev'],
    });
    assert.equal(out.secrets[0].description, 'Sentry DSN');
    assert.equal(out.secrets[0].required, false);
  });

  it('rejects non-object root', () => {
    assert.throws(() => validateRequired(null), ValidationError);
    assert.throws(() => validateRequired([]), ValidationError);
    assert.throws(() => validateRequired('nope'), ValidationError);
  });

  it('rejects missing top-level arrays', () => {
    assert.throws(
      () => validateRequired({ secrets: [{ name: 'X' }] }),
      /configs: must be an array/,
    );
    assert.throws(
      () => validateRequired({ configs: ['dev'] }),
      /secrets: must be an array/,
    );
  });

  it('requires SCREAMING_SNAKE_CASE secret names', () => {
    assert.throws(
      () => validateRequired({ secrets: [{ name: 'apiKey' }], configs: ['dev'] }),
      /SCREAMING_SNAKE_CASE/,
    );
  });

  it('rejects duplicate secret names', () => {
    assert.throws(
      () =>
        validateRequired({
          secrets: [{ name: 'A' }, { name: 'A' }],
          configs: ['dev'],
        }),
      /duplicate/,
    );
  });

  it('rejects unknown configs', () => {
    assert.throws(
      () => validateRequired({ secrets: [], configs: ['lol'] }),
      /expected one of/,
    );
  });

  it('rejects empty config strings', () => {
    assert.throws(
      () => validateRequired({ secrets: [], configs: [''] }),
      /must be a non-empty string/,
    );
  });
});

describe('loadRequired', () => {
  let dir;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true });
    dir = null;
  });

  it('loads + validates a JSON file', () => {
    dir = mkdtempSync(join(tmpdir(), 'bn-doppler-'));
    const p = join(dir, 'doppler-required.json');
    writeFileSync(
      p,
      JSON.stringify({
        secrets: [{ name: 'FOO' }],
        configs: ['dev'],
      }),
    );
    const out = loadRequired(p);
    assert.equal(out.secrets[0].name, 'FOO');
  });

  it('throws helpful error when file missing', () => {
    assert.throws(
      () => loadRequired('/nope/doppler-required.json'),
      /not found/,
    );
  });

  it('throws helpful error when JSON is invalid', () => {
    dir = mkdtempSync(join(tmpdir(), 'bn-doppler-'));
    const p = join(dir, 'doppler-required.json');
    writeFileSync(p, '{ not: json');
    assert.throws(() => loadRequired(p), /not valid JSON/);
  });
});

describe('findMissing', () => {
  it('returns empty when all required present', () => {
    const schema = validateRequired({
      secrets: [{ name: 'A' }, { name: 'B' }],
      configs: ['dev'],
    });
    assert.deepEqual(findMissing(schema, { A: '1', B: '2' }), []);
  });

  it('returns missing required names', () => {
    const schema = validateRequired({
      secrets: [{ name: 'A' }, { name: 'B' }],
      configs: ['dev'],
    });
    assert.deepEqual(findMissing(schema, { A: '1' }), ['B']);
  });

  it('skips optional secrets', () => {
    const schema = validateRequired({
      secrets: [
        { name: 'A' },
        { name: 'OPTIONAL', required: false },
      ],
      configs: ['dev'],
    });
    assert.deepEqual(findMissing(schema, { A: '1' }), []);
  });

  it('treats empty strings as missing', () => {
    const schema = validateRequired({
      secrets: [{ name: 'A' }],
      configs: ['dev'],
    });
    assert.deepEqual(findMissing(schema, { A: '' }), ['A']);
  });
});

describe('requireSecrets', () => {
  it('returns the resolved values when all present', async () => {
    process.env.BN_TEST_FOO = '1';
    process.env.BN_TEST_BAR = '2';
    try {
      const out = await requireSecrets(['BN_TEST_FOO', 'BN_TEST_BAR'], {
        source: 'env',
      });
      assert.equal(out.BN_TEST_FOO, '1');
      assert.equal(out.BN_TEST_BAR, '2');
    } finally {
      delete process.env.BN_TEST_FOO;
      delete process.env.BN_TEST_BAR;
    }
  });

  it('throws MissingSecretsError listing every missing', async () => {
    delete process.env.NONEXISTENT_A;
    delete process.env.NONEXISTENT_B;
    await assert.rejects(
      () =>
        requireSecrets(['NONEXISTENT_A', 'NONEXISTENT_B'], { source: 'env' }),
      (err) =>
        err instanceof MissingSecretsError &&
        err.missing.includes('NONEXISTENT_A') &&
        err.missing.includes('NONEXISTENT_B'),
    );
  });

  it('rejects empty input', async () => {
    await assert.rejects(() => requireSecrets([]), TypeError);
  });
});

describe('injectIntoWrangler', () => {
  it('routes _TOKEN/_KEY/_SECRET to secrets, others to vars', () => {
    const env = {
      APP_NAME: 'my-app',
      LOG_LEVEL: 'info',
      API_TOKEN: 'tok_abc',
      DATABASE_URL: 'postgres://...',
      SESSION_SECRET: 'shhh',
    };
    const out = injectIntoWrangler({
      env,
      names: ['APP_NAME', 'LOG_LEVEL', 'API_TOKEN', 'SESSION_SECRET'],
    });
    assert.equal(out.vars.APP_NAME, 'my-app');
    assert.equal(out.vars.LOG_LEVEL, 'info');
    assert.equal(out.secrets.API_TOKEN, 'tok_abc');
    assert.equal(out.secrets.SESSION_SECRET, 'shhh');
    assert.ok(!('API_TOKEN' in out.vars));
  });

  it('respects explicit secretNames', () => {
    const env = { LOG_LEVEL: 'debug' };
    const out = injectIntoWrangler({
      env,
      names: ['LOG_LEVEL'],
      secretNames: ['LOG_LEVEL'],
    });
    assert.equal(out.secrets.LOG_LEVEL, 'debug');
    assert.ok(!('LOG_LEVEL' in out.vars));
  });

  it('routes long random-looking values to secrets too', () => {
    const env = {
      RANDOM_THING: 'abcdef0123456789abcdef0123456789abcdef',
    };
    const out = injectIntoWrangler({ env, names: ['RANDOM_THING'] });
    assert.ok(out.secrets.RANDOM_THING);
  });

  it('throws MissingSecretsError on missing values', () => {
    assert.throws(
      () => injectIntoWrangler({ env: {}, names: ['NOPE'] }),
      MissingSecretsError,
    );
  });

  it('rejects invalid input', () => {
    assert.throws(
      () => injectIntoWrangler({ env: {}, names: 'nope' }),
      TypeError,
    );
  });
});
