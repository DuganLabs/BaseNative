import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createErrorBoundary, renderWithBoundary } from './error-boundary.js';

describe('createErrorBoundary', () => {
  it('returns result when no error occurs', () => {
    const boundary = createErrorBoundary();
    const result = boundary.try(() => 'success');
    assert.equal(result, 'success');
    assert.equal(boundary.hasError(), false);
  });

  it('returns null and captures error when fn throws', () => {
    const boundary = createErrorBoundary();
    const result = boundary.try(() => { throw new Error('oops'); });
    assert.equal(result, null);
    assert.equal(boundary.hasError(), true);
    assert.equal(boundary.getError().message, 'oops');
  });

  it('calls onError callback with the caught error', () => {
    let caught = null;
    const boundary = createErrorBoundary({ onError: err => { caught = err; } });
    boundary.try(() => { throw new Error('cb-error'); });
    assert.ok(caught instanceof Error);
    assert.equal(caught.message, 'cb-error');
  });

  it('returns fallback HTML string', () => {
    const boundary = createErrorBoundary({ fallback: '<p>Error state</p>' });
    boundary.try(() => { throw new Error('x'); });
    assert.equal(boundary.getFallback(), '<p>Error state</p>');
  });

  it('getFallback returns empty string when not set', () => {
    const boundary = createErrorBoundary();
    assert.equal(boundary.getFallback(), '');
  });

  it('reset() clears error state', () => {
    const boundary = createErrorBoundary();
    boundary.try(() => { throw new Error('reset me'); });
    assert.equal(boundary.hasError(), true);
    boundary.reset();
    assert.equal(boundary.hasError(), false);
    assert.equal(boundary.getError(), null);
  });

  it('allows successful try after reset', () => {
    const boundary = createErrorBoundary();
    boundary.try(() => { throw new Error('first'); });
    boundary.reset();
    const result = boundary.try(() => 42);
    assert.equal(result, 42);
    assert.equal(boundary.hasError(), false);
  });

  it('emits diagnostic on error', () => {
    const diagnostics = [];
    const boundary = createErrorBoundary({
      onDiagnostic(d) { diagnostics.push(d); },
    });
    boundary.try(() => { throw new Error('diag-test'); });
    assert.ok(diagnostics.some(d => d.code === 'BN_ERROR_BOUNDARY_CAUGHT'));
  });
});

describe('renderWithBoundary', () => {
  it('returns rendered output when no error', () => {
    const result = renderWithBoundary(() => '<p>OK</p>');
    assert.equal(result, '<p>OK</p>');
  });

  it('returns fallback HTML when renderFn throws', () => {
    const result = renderWithBoundary(
      () => { throw new Error('render failed'); },
      { fallback: '<p>Fallback</p>' }
    );
    assert.equal(result, '<p>Fallback</p>');
  });

  it('returns comment-based fallback when no fallback option given', () => {
    const result = renderWithBoundary(() => { throw new Error('oops'); });
    assert.match(result, /<!--.*oops.*-->/);
  });

  it('calls onError when renderFn throws', () => {
    let caughtMsg = null;
    renderWithBoundary(
      () => { throw new Error('my error'); },
      { onError: err => { caughtMsg = err.message; } }
    );
    assert.equal(caughtMsg, 'my error');
  });

  it('escapes double-hyphens in error message for HTML comment safety', () => {
    const result = renderWithBoundary(() => { throw new Error('a--b'); });
    assert.ok(!result.includes('--b'), 'double-dash should be escaped in comment');
  });
});
