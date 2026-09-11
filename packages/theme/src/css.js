/**
 * A token layer carries its rationale in CSS comments, which is where a
 * designer or a reviewer looks for it. None of that needs to reach a phone on
 * a job site: on one Greenput micro-site the comments were about 6 KB of the
 * served stylesheet, on a page whose whole selling point is its weight.
 *
 * So the prose stays in the source and is stripped at the point the sheet is
 * served or adopted. Deliberately conservative — comments and indentation
 * only. It does not touch whitespace inside a selector, a `calc()` or a quoted
 * string, because a stylesheet that ships slightly larger is a much smaller
 * problem than one that ships broken.
 */

/**
 * Removes CSS comment blocks, including the multi-line rationale ones.
 *
 * A scan rather than a pattern, deliberately. Every regex for a C comment —
 * the lazy `\/\*[\s\S]*?\*\/` and the unrolled-loop form alike — is polynomial
 * on a stylesheet carrying many unterminated `/*`, because the engine restarts
 * and rescans to the end from each one (CodeQL js/polynomial-redos; measured
 * here at six seconds for 40k of them, and instant after this change). Two
 * `indexOf` calls per comment only ever move forward, so this is linear.
 *
 * An unterminated comment is left in place rather than swallowed to the end of
 * the file. A real parser would swallow it, but this function's whole remit is
 * to be conservative: shipping a slightly larger sheet is a much smaller
 * problem than shipping one with its last rule silently deleted.
 *
 * @param {string} css
 * @returns {string}
 */
function stripComments(css) {
  let out = '';
  let i = 0;
  for (;;) {
    const start = css.indexOf('/*', i);
    if (start === -1) return out + css.slice(i);
    const end = css.indexOf('*/', start + 2);
    if (end === -1) return out + css.slice(i);
    out += css.slice(i, start);
    i = end + 2;
  }
}

/**
 * Strips comments and leading indentation from a stylesheet.
 *
 * @param {string} css
 * @returns {string}
 */
export function minifyCss(css) {
  return (
    stripComments(css)
      // Leading indentation on every line.
      .replace(/^[ \t]+/gm, '')
      // Blank lines left behind by the two passes above.
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}
