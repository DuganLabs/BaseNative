import { render } from './render.js';

/**
 * Streaming SSR renderer for BaseNative.
 *
 * Splits a template into chunks and writes them to a writable stream.
 * Compatible with Express `res.write()` and Web Streams API.
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

  // Render full HTML first, then stream in chunks
  const rendered = render(html, ctx, {
    hydratable: options.hydratable,
    onDiagnostic: options.onDiagnostic,
  });

  let offset = 0;

  function writeNext() {
    while (offset < rendered.length) {
      const chunk = rendered.slice(offset, offset + chunkSize);
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
 *
 * @param {string} html - Full HTML template
 * @param {object} ctx - Template context
 * @param {object} [options]
 * @returns {ReadableStream}
 */
export function renderToReadableStream(html, ctx, options = {}) {
  const rendered = render(html, ctx, {
    hydratable: options.hydratable,
    onDiagnostic: options.onDiagnostic,
  });

  const chunkSize = options.chunkSize || 4096;
  let offset = 0;

  return new ReadableStream({
    pull(controller) {
      if (offset >= rendered.length) {
        controller.close();
        return;
      }

      const chunk = rendered.slice(offset, offset + chunkSize);
      offset += chunkSize;
      controller.enqueue(new TextEncoder().encode(chunk));
    },
  });
}
