// Built with BaseNative — basenative.dev
/**
 * A single error type with a stable machine-readable `code`, so a caller can
 * branch on the failure without matching on message text.
 *
 * @module
 */

/**
 * @typedef {"satori-unsupported-on-this-runtime"
 *   | "satori-not-installed"
 *   | "wasm-source-unavailable"
 *   | "wasm-source-invalid"
 *   | "font-fetch-failed"
 *   | "no-fonts"} OgImageErrorCode
 */

export class OgImageError extends Error {
  /**
   * @param {OgImageErrorCode} code
   * @param {string} message
   * @param {{ cause?: unknown }} [opts]
   */
  constructor(code, message, opts = {}) {
    super(message, opts);
    this.name = "OgImageError";
    /** @type {OgImageErrorCode} */
    this.code = code;
  }
}
