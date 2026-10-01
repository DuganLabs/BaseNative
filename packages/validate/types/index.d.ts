import type { Span } from './scan.js';

export type { Span } from './scan.js';

export type Severity = 'error' | 'warning';
export type Confidence = 'high' | 'medium' | 'low';

export type DiagnosticCode =
  | 'BN_E_FOREIGN_DIRECTIVE'
  | 'BN_E_UNKNOWN_DIRECTIVE'
  | 'BN_E_CONTROL_FLOW_ON_ELEMENT'
  | 'BN_E_EXPR_UNSUPPORTED'
  | 'BN_E_UNBOUND_REF'
  | 'BN_E_MALFORMED_FOR'
  | 'BN_E_ORPHAN_BRANCH';

/** Blocking: the template will not render, or will render wrongly and silently. */
export const ERROR: 'error';
/** Non-blocking: renders today, but relies on behaviour that is unspecified or fragile. */
export const WARNING: 'warning';

export const CONFIDENCE: {
  readonly HIGH: 'high';
  readonly MEDIUM: 'medium';
  readonly LOW: 'low';
};

/** Default severity and confidence for a diagnostic code. A rule may override either per diagnostic. */
export interface CodeMeta<S extends Severity = Severity, C extends Confidence = Confidence> {
  severity: S;
  confidence: C;
  summary: string;
}

export const CODES: {
  BN_E_FOREIGN_DIRECTIVE: CodeMeta<'error', 'high'>;
  BN_E_UNKNOWN_DIRECTIVE: CodeMeta<'error', 'medium'>;
  BN_E_CONTROL_FLOW_ON_ELEMENT: CodeMeta<'error', 'high'>;
  BN_E_EXPR_UNSUPPORTED: CodeMeta<'error', 'high'>;
  BN_E_UNBOUND_REF: CodeMeta<'warning', 'medium'>;
  BN_E_MALFORMED_FOR: CodeMeta<'error', 'high'>;
  BN_E_ORPHAN_BRANCH: CodeMeta<'error', 'high'>;
};

export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;
  message: string;
  /** Concrete corrected syntax, repairable without consulting documentation. */
  suggestion: string;
  span: Span;
  confidence: Confidence;
}

export interface ValidateOptions {
  /** When supplied, references to keys absent from the context are reported as `BN_E_UNBOUND_REF`. */
  context?: Record<string, unknown> | null;
}

export interface ValidationResult {
  /** False when at least one diagnostic has severity `error`. */
  valid: boolean;
  /** Sorted by line, then column. */
  diagnostics: Diagnostic[];
}

/** Validate BaseNative template markup and return structured, repairable diagnostics. */
export function validateTemplate(source: string, options?: ValidateOptions): ValidationResult;
