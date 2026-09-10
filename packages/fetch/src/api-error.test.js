import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, isApiError } from './api-error.js';

describe('ApiError', () => {
  it('captures status, code, message, url', () => {
    const err = new ApiError('Bad request', {
      status: 400,
      code: 'invalid_input',
      url: 'https://api.example.com/leads',
    });
    assert.equal(err.message, 'Bad request');
    assert.equal(err.status, 400);
    assert.equal(err.code, 'invalid_input');
    assert.equal(err.url, 'https://api.example.com/leads');
    assert.equal(err.name, 'ApiError');
    assert.ok(err instanceof Error);
  });

  it('falls back to a generated code when none is provided', () => {
    assert.equal(new ApiError('boom', { status: 500, url: '/x' }).code, 'http_500');
  });

  it('uses http_network when status is 0', () => {
    assert.equal(new ApiError('offline', { status: 0, url: '/x' }).code, 'http_network');
  });

  it('preserves cause', () => {
    const cause = new Error('underlying');
    const err = new ApiError('wrapper', { status: 0, url: '/x', cause });
    assert.equal(err.cause, cause);
  });

  it('does not define cause when none is given', () => {
    assert.equal('cause' in new ApiError('x', { status: 1, url: '/x' }), false);
  });

  it('captures the field hint for form errors', () => {
    const err = new ApiError('Email required', { status: 422, url: '/x', field: 'email' });
    assert.equal(err.field, 'email');
  });

  it('captures the parsed body and the Response', () => {
    const response = new Response(null, { status: 409 });
    const body = { error: { code: 'conflict', message: 'Taken' } };
    const err = new ApiError('Taken', { status: 409, url: '/x', body, response });
    assert.equal(err.body, body);
    assert.equal(err.response, response);
  });

  it('defaults url to an empty string', () => {
    assert.equal(new ApiError('x', { status: 0 }).url, '');
  });
});

describe('isApiError', () => {
  it('returns true for ApiError instances', () => {
    assert.equal(isApiError(new ApiError('x', { status: 1, url: '/x' })), true);
  });

  it('returns false for plain Errors', () => {
    assert.equal(isApiError(new Error('x')), false);
  });

  it('returns false for non-error values', () => {
    assert.equal(isApiError({}), false);
    assert.equal(isApiError(null), false);
    assert.equal(isApiError('boom'), false);
  });
});
