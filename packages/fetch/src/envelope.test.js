import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isApiErrorEnvelope, isApiResponse, unwrap } from './envelope.js';
import { ApiError } from './api-error.js';

describe('isApiResponse', () => {
  it('detects an envelope with `data`', () => {
    assert.equal(isApiResponse({ data: { id: 1 } }), true);
  });

  it('rejects values without data', () => {
    assert.equal(isApiResponse({ error: 'x' }), false);
    assert.equal(isApiResponse(null), false);
    assert.equal(isApiResponse(undefined), false);
    assert.equal(isApiResponse('x'), false);
    assert.equal(isApiResponse(42), false);
  });
});

describe('isApiErrorEnvelope', () => {
  it('detects an error envelope', () => {
    assert.equal(isApiErrorEnvelope({ error: { code: 'foo', message: 'bar' } }), true);
  });

  it('rejects non-object values', () => {
    assert.equal(isApiErrorEnvelope(null), false);
    assert.equal(isApiErrorEnvelope('boom'), false);
    assert.equal(isApiErrorEnvelope({}), false);
    assert.equal(isApiErrorEnvelope({ error: null }), false);
    assert.equal(isApiErrorEnvelope({ error: 'string' }), false);
  });
});

describe('unwrap', () => {
  it('returns the data field of a resolved envelope', async () => {
    const envelope = { data: { name: 'Jane' } };
    assert.deepEqual(await unwrap(Promise.resolve(envelope)), { name: 'Jane' });
  });

  it('rejects when the underlying promise rejects', async () => {
    await assert.rejects(unwrap(Promise.reject(new Error('boom'))), { message: 'boom' });
  });

  it('returns the data field of a plain envelope synchronously', () => {
    const envelope = { data: [1, 2], meta: { total: 2, page: 1, perPage: 25 } };
    assert.deepEqual(unwrap(envelope), [1, 2]);
  });

  it('throws ApiError for an error envelope', () => {
    const envelope = { error: { code: 'not_found', message: 'Missing', field: 'id' } };
    assert.throws(
      () => unwrap(envelope),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 0);
        assert.equal(err.code, 'not_found');
        assert.equal(err.message, 'Missing');
        assert.equal(err.field, 'id');
        assert.equal(err.body, envelope);
        return true;
      }
    );
  });

  it('rejects with ApiError when a promise resolves to an error envelope', async () => {
    await assert.rejects(
      unwrap(Promise.resolve({ error: { code: 'expired', message: 'Session expired' } })),
      (err) => err instanceof ApiError && err.code === 'expired'
    );
  });

  it('throws an actionable TypeError for values that are not envelopes', () => {
    assert.throws(() => unwrap(null), { name: 'TypeError', message: /expects an envelope .* got null/ });
    assert.throws(() => unwrap({ ok: true }), TypeError);
  });
});
