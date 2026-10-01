import type { RenderOptions } from './render.js';

/** The writable-stream surface `renderToStream` calls: `write`, `once('drain')` and `end`. */
export interface WritableLike {
  write(chunk: string): boolean;
  once(event: 'drain', listener: () => void): unknown;
  end(): void;
}

export interface StreamOptions extends Pick<RenderOptions, 'hydratable' | 'onDiagnostic'> {
  /** Characters per chunk. Defaults to 4096. */
  chunkSize?: number;
}

/**
 * Renders a template and writes it to `stream` in chunks, waiting for `drain`
 * when `write` reports backpressure. Deferred sections follow the main content
 * as script injections. Ends the stream when done.
 */
export function renderToStream(
  html: string,
  ctx: Record<string, unknown> | undefined,
  stream: WritableLike,
  options?: StreamOptions,
): void;

/**
 * Renders a template and returns a Web ReadableStream of UTF-8 encoded chunks.
 * Deferred sections are appended after the main content as script injections.
 */
export function renderToReadableStream(
  html: string,
  ctx?: Record<string, unknown>,
  options?: StreamOptions,
): ReadableStream<Uint8Array>;
