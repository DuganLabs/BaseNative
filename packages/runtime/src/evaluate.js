import { evaluateExpression } from './shared/expression.js';

export function evaluate(expr, ctx, options) {
  return evaluateExpression(expr, ctx, options);
}

export function interpolate(text, ctx, options) {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const val = evaluate(expr, ctx, options);
    return val != null ? val : '';
  });
}
