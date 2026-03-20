/**
 * Error boundary system for BaseNative templates.
 *
 * Provides a `@catch` directive that catches rendering errors in child templates
 * and renders a fallback instead.
 *
 * Usage (template):
 *   <template @catch="handleError">
 *     <template @for="item of items(); track item.id">
 *       <div>{{ item.name }}</div>
 *     </template>
 *   </template>
 *
 * Usage (programmatic):
 *   const boundary = createErrorBoundary({
 *     onError(error) { console.error('Caught:', error); },
 *     fallback: '<p>Something went wrong.</p>',
 *   });
 */

import { emitDiagnostic } from './diagnostics.js';

/**
 * Creates an error boundary that wraps template rendering.
 *
 * @param {object} options
 * @param {Function} [options.onError] - Error handler callback
 * @param {string} [options.fallback] - Fallback HTML string
 * @returns {ErrorBoundary}
 */
export function createErrorBoundary(options = {}) {
  let lastError = null;
  let hasError = false;

  return {
    /**
     * Wraps a function call in error handling.
     * Returns the result on success, or null on error.
     */
    try(fn) {
      try {
        const result = fn();
        return result;
      } catch (error) {
        lastError = error;
        hasError = true;

        if (options.onError) {
          options.onError(error);
        }

        emitDiagnostic(options, {
          level: 'error',
          domain: 'boundary',
          code: 'BN_ERROR_BOUNDARY_CAUGHT',
          message: error.message || 'An error occurred during rendering',
          error,
        });

        return null;
      }
    },

    /**
     * Returns the last caught error, if any.
     */
    getError() {
      return lastError;
    },

    /**
     * Returns whether an error has been caught.
     */
    hasError() {
      return hasError;
    },

    /**
     * Returns the fallback HTML string.
     */
    getFallback() {
      return options.fallback || '';
    },

    /**
     * Resets the error state.
     */
    reset() {
      lastError = null;
      hasError = false;
    },
  };
}

/**
 * Server-side error boundary for render().
 * Wraps template rendering and returns fallback HTML on error.
 *
 * @param {Function} renderFn - Function that returns rendered HTML
 * @param {object} options
 * @param {string} [options.fallback] - Fallback HTML
 * @param {Function} [options.onError] - Error handler
 * @returns {string} Rendered HTML or fallback
 */
export function renderWithBoundary(renderFn, options = {}) {
  try {
    return renderFn();
  } catch (error) {
    if (options.onError) {
      options.onError(error);
    }
    return options.fallback || `<!-- BaseNative render error: ${escapeComment(error.message)} -->`;
  }
}

function escapeComment(str) {
  return String(str).replace(/--/g, '- -');
}
