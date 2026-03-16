export function evaluate(expr, ctx) {
  try {
    const keys = Object.keys(ctx);
    return new Function(...keys, `return(${expr})`)(...keys.map(k => ctx[k]));
  } catch { return undefined; }
}

export function interpolate(text, ctx) {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const val = evaluate(expr, ctx);
    return val != null ? val : '';
  });
}
