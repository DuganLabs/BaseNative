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
 * Strips comments and leading indentation from a stylesheet.
 *
 * @param {string} css
 * @returns {string}
 */
export function minifyCss(css) {
  return (
    css
      // `/* … */`, including the multi-line rationale blocks.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Leading indentation on every line.
      .replace(/^[ \t]+/gm, '')
      // Blank lines left behind by the two passes above.
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}
