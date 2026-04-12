import { render, resolveDeferred } from './render.js';

/**
 * Streaming SSR renderer for BaseNative.
 *
 * Splits a template into chunks and writes them to a writable stream.
 * Compatible with Express `res.write()` and Web Streams API.
 * Deferred sections are streamed after the main content as script injections.
 *
 * @param {string} html - Full HTML template
 * @param {object} ctx - Template context
 * @param {object} stream - Writable stream with write() and end() methods
 * @param {object} [options]
 * @param {number} [options.chunkSize] - Number of characters per chunk (default: 4096)
 * @param {boolean} [options.hydratable] - Enable hydration markers
 * @param {Function} [options.onDiagnostic] - Diagnostic callback
 */
export function renderToStream(html, ctx, stream, options = {}) {
  const chunkSize = options.chunkSize || 4096;

  const renderOptions = {
    hydratable: options.hydratable,
    onDiagnostic: options.onDiagnostic,
  };
  const rendered = render(html, ctx, renderOptions);
  const deferred = resolveDeferred(renderOptions);

  const fullOutput = rendered + deferred.map(d => d.script).join('');
  let offset = 0;

  function writeNext() {
    while (offset < fullOutput.length) {
      const chunk = fullOutput.slice(offset, offset + chunkSize);
      offset += chunkSize;

      const canContinue = stream.write(chunk);
      if (!canContinue) {
        stream.once('drain', writeNext);
        return;
      }
    }
    stream.end();
  }

  writeNext();
}

/**
 * Renders a template and returns a Web ReadableStream.
 * Deferred sections are appended after the main content as script injections.
 *
 * @param {string} html - Full HTML template
 * @param {object} ctx - Template context
 * @param {object} [options]
 * @returns {ReadableStream}
 */
export function renderToReadableStream(html, ctx, options = {}) {
  const renderOptions = {
    hydratable: options.hydratable,
    onDiagnostic: options.onDiagnostic,
  };
  const rendered = render(html, ctx, renderOptions);
  const deferred = resolveDeferred(renderOptions);

  const fullOutput = rendered + deferred.map(d => d.script).join('');
  const chunkSize = options.chunkSize || 4096;
  let offset = 0;

  return new ReadableStream({
    pull(controller) {
      if (offset >= fullOutput.length) {
        controller.close();
        return;
      }

      const chunk = fullOutput.slice(offset, offset + chunkSize);
      offset += chunkSize;
      controller.enqueue(new TextEncoder().encode(chunk));
    },
  });
}
