/**
 * Error taxonomy for @basenative/validate.
 *
 * Design principle (PRD W1): every diagnostic must be repairable by a model from
 * the object alone, with no access to documentation. If a model would have to look
 * something up to act on a diagnostic, that diagnostic is incomplete.
 *
 * That means each entry carries a `fix` that produces concrete corrected syntax —
 * not a description of the problem, and not a pointer to docs.
 */

/** Blocking: the template will not render, or will render wrongly and silently. */
export const ERROR = 'error';
/** Non-blocking: renders today, but relies on behaviour that is unspecified or fragile. */
export const WARNING = 'warning';

/**
 * `high`   — the correction is mechanical; a model can apply it verbatim.
 * `medium` — the correction is the common case but depends on author intent.
 * `low`    — the diagnostic is a strong signal, but the fix requires context we lack.
 */
export const CONFIDENCE = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

export const CODES = {
  /**
   * Syntax from a neighbouring framework. This is the anti-drift mechanism: the
   * failure mode for a model writing BaseNative is confident regression to the
   * nearest neighbour (Vue/Angular/Svelte/Alpine), not invention.
   */
  BN_E_FOREIGN_DIRECTIVE: {
    severity: ERROR,
    confidence: CONFIDENCE.HIGH,
    summary: 'Syntax from another framework',
  },

  /** An `@`-directive on a <template> that BaseNative does not define. */
  BN_E_UNKNOWN_DIRECTIVE: {
    severity: ERROR,
    confidence: CONFIDENCE.MEDIUM,
    summary: 'Unknown directive',
  },

  /**
   * Control flow written on a normal element instead of a <template>.
   * This is the most dangerous class in the language: on a non-template element
   * every `@name` attribute is registered as an event listener, so `<div @if="x">`
   * silently binds an "if" event and never renders conditionally. It fails with no
   * error at runtime, which is precisely why the validator must catch it.
   */
  BN_E_CONTROL_FLOW_ON_ELEMENT: {
    severity: ERROR,
    confidence: CONFIDENCE.HIGH,
    summary: 'Control-flow directive on a non-template element',
  },

  /** Expression outside the CSP-safe subset. */
  BN_E_EXPR_UNSUPPORTED: {
    severity: ERROR,
    confidence: CONFIDENCE.HIGH,
    summary: 'Expression outside the CSP-safe subset',
  },

  /** Interpolation references a key absent from the supplied context object. */
  BN_E_UNBOUND_REF: {
    severity: WARNING,
    confidence: CONFIDENCE.MEDIUM,
    summary: 'Reference not present in context',
  },

  /** `@for` that does not match `item of items`, or is missing `track`. */
  BN_E_MALFORMED_FOR: {
    severity: ERROR,
    confidence: CONFIDENCE.HIGH,
    summary: 'Malformed @for expression',
  },

  /** `@else` / `@case` / `@default` / `@empty` without a governing branch. */
  BN_E_ORPHAN_BRANCH: {
    severity: ERROR,
    confidence: CONFIDENCE.HIGH,
    summary: 'Branch directive without a governing directive',
  },
};

/**
 * Build a diagnostic. Callers supply the human-facing `message` and the concrete
 * `suggestion`; severity and confidence come from the taxonomy so they stay
 * consistent across rules, and a rule may override confidence when it genuinely
 * knows less than the code's default (e.g. an inferred rather than literal fix).
 */
export function diagnostic(code, { message, suggestion, span, confidence, severity }) {
  const meta = CODES[code];
  if (!meta) throw new Error(`Unknown diagnostic code: ${code}`);
  return {
    code,
    // A rule may downgrade severity when the runtime genuinely accepts the input
    // (e.g. `@for` without `track` renders, but forfeits keyed reconciliation).
    // The validator must never report as an error something the runtime allows.
    severity: severity ?? meta.severity,
    message,
    suggestion,
    span,
    confidence: confidence ?? meta.confidence,
  };
}
