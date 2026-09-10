/**
 * Types for `@basenative/runtime/shared/expression` — the CSP-safe expression
 * evaluator used internally by both `hydrate()` (client) and `@basenative/server`'s
 * `render()` (SSR). No `eval`, no `new Function`: expressions are tokenized and
 * parsed into a small AST, then walked by an interpreter with an explicit
 * operation allowlist.
 */

/** A successfully compiled expression, cached by trimmed source string. */
export interface CompiledExpression {
  source: string;
  ast: unknown;
}

/** A compiled expression that failed to parse. */
export interface FailedExpression {
  source: string;
  error: Error;
}

/** The `Symbol.for('basenative.scopeSlot')` used to tag scope slots. */
export const SCOPE_SLOT: symbol;

/**
 * Returns whether `value` is a "scope slot" — an object tagged with `SCOPE_SLOT`
 * and exposing a `.get()` method, used internally to thread `@for` loop variables
 * through nested scopes.
 */
export function isScopeSlot(value: unknown): boolean;

/**
 * Parses `source` into `{ source, ast }`, or `{ source, error }` on a syntax
 * error. Cached by trimmed source string.
 */
export function compileExpression(source: string): CompiledExpression | FailedExpression;

/**
 * Compiles (if `source` is a string) and evaluates an expression against a
 * context object. Returns `undefined` and reports a diagnostic through
 * `options.onDiagnostic` instead of throwing, on both a compile error and an
 * evaluation-time error.
 */
export function evaluateExpression(
  source: string | CompiledExpression | FailedExpression,
  ctx?: Record<string, unknown>,
  options?: { onDiagnostic?: (diagnostic: Record<string, unknown>) => void },
): unknown;

/** Empties the module-level compile cache. */
export function clearExpressionCache(): void;
