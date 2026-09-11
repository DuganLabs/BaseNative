/**
 * Icon discipline, not icons.
 *
 * Greenput's nav used to ship a single letter per route ("D Dashboard",
 * "L Leads", "Σ Reports") — placeholder text that read as scaffolding and, at a
 * glance in a van, as noise. What replaced it was not a good icon library; it
 * was fifteen icons drawn on ONE grid at ONE stroke weight with round caps, no
 * fills and no colour of their own, plus a spec that asserted exactly that. The
 * row read as a set because nothing in it was allowed to differ.
 *
 * The fifteen icons stayed with Greenput — they are its nouns, not everyone's.
 * The invariants are what generalise, so this module ships those: a set is
 * declared with its grid and its stroke width once, every icon in it inherits
 * both, and `validateIconSet` refuses anything that would break the set's
 * evenness — a fill, a baked-in colour, an inline style, a per-icon stroke
 * weight, a grid of its own.
 *
 * Icons render `aria-hidden` by default, because an icon beside its own label
 * is decoration. Pass a `title` for the case where it is the only label.
 */

/** Thrown by `defineIconSet` when a set breaks its own invariants. */
export class IconSetError extends Error {
  /**
   * @param {string[]} errors
   */
  constructor(errors) {
    super(`Invalid icon set:\n  - ${errors.join('\n  - ')}`);
    this.name = 'IconSetError';
    /** @type {string[]} */
    this.errors = errors;
  }
}

const ICON_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Attributes an icon body may not carry, each with the reason it breaks the set.
 * Matched on the body text, which is why a body is markup and not a DOM tree:
 * the set is a string table, cheap to ship and trivial to inline server-side.
 */
const FORBIDDEN = [
  [/\bfill\s*=\s*["'](?!none\b)/i, 'a fill — the set is strokes, so a filled icon reads heavier than its neighbours'],
  [/\bstroke\s*=\s*["'](?!currentColor\b)/i, 'a baked-in stroke colour — icons inherit currentColor so they work on any surface'],
  [/\bstroke-width\s*=/i, 'its own stroke-width — the set declares one weight'],
  [/\bstyle\s*=/i, 'an inline style — BaseNative axiom 2'],
  [/<svg\b/i, 'a nested <svg> — a body is the contents of one, not another one'],
  [/\bviewBox\s*=/i, 'its own viewBox — the set declares one grid'],
];

/*
 * Deliberately NOT forbidden: `width` / `height` on a body element.
 *
 * The rule that an icon must not size itself is real, but it is about the
 * OUTER <svg>, which `renderIcon` writes and a body does not have — and a body
 * that smuggles one in is already caught by the nested-<svg> rule above. Inside
 * a body, `width` and `height` are ordinary geometry: `<rect x="3" y="5"
 * width="18" height="16" rx="2"/>` is a calendar, and three of the fifteen
 * Greenput icons this discipline was extracted from are drawn exactly that way.
 * Forbidding the attribute outright made the set unable to express the set it
 * came from, which is why there is a test below holding that open.
 */

/**
 * Declares an icon set: one grid, one stroke weight, many bodies.
 *
 * @param {object} spec
 * @param {number} [spec.grid=24]           the viewBox is `0 0 grid grid`
 * @param {number} [spec.strokeWidth=1.75]  in grid units, so it scales with the icon
 * @param {'round'|'butt'|'square'} [spec.linecap='round']
 * @param {'round'|'bevel'|'miter'} [spec.linejoin='round']
 * @param {Record<string, string>} spec.icons  name -> SVG body markup
 * @returns {{grid: number, strokeWidth: number, linecap: string, linejoin: string, icons: Record<string,string>, names: string[]}}
 * @throws {IconSetError}
 */
export function defineIconSet(spec) {
  const set = {
    grid: spec.grid ?? 24,
    strokeWidth: spec.strokeWidth ?? 1.75,
    linecap: spec.linecap ?? 'round',
    linejoin: spec.linejoin ?? 'round',
    icons: { ...(spec.icons ?? {}) },
  };
  set.names = Object.keys(set.icons).sort();
  const { ok, errors } = validateIconSet(set);
  if (!ok) throw new IconSetError(errors);
  Object.freeze(set.icons);
  Object.freeze(set.names);
  return Object.freeze(set);
}

/**
 * Checks a set's invariants without throwing.
 *
 * @param {object} set
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateIconSet(set) {
  const errors = [];
  if (!Number.isFinite(set.grid) || set.grid <= 0) {
    errors.push(`grid is ${String(set.grid)} — a set needs one positive grid size`);
  }
  if (!Number.isFinite(set.strokeWidth) || set.strokeWidth <= 0) {
    errors.push(`strokeWidth is ${String(set.strokeWidth)} — a set needs one positive stroke weight`);
  }
  const icons = set.icons ?? {};
  if (Object.keys(icons).length === 0) errors.push('the set declares no icons');
  for (const [name, body] of Object.entries(icons)) {
    if (!ICON_NAME.test(name)) errors.push(`"${name}" is not a kebab-case icon name`);
    if (typeof body !== 'string' || body.trim() === '') {
      errors.push(`"${name}" has an empty body`);
      continue;
    }
    for (const [pattern, why] of FORBIDDEN) {
      if (pattern.test(body)) errors.push(`"${name}" carries ${why}`);
    }
    if (/#[0-9a-f]{3,8}\b/i.test(body)) {
      errors.push(`"${name}" carries a literal colour — icons inherit currentColor`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders one icon from a set as an `<svg>` string.
 *
 * @param {object} set   from `defineIconSet`
 * @param {string} name
 * @param {object} [options]
 * @param {string} [options.title]  makes the icon its own label (`role="img"`);
 *   omit it whenever the icon sits beside visible text, which is the common case
 * @param {string} [options.size]   a CSS length for width and height; default is
 *   `1em`, so an icon tracks the type it sits in
 * @param {string} [options.attrs]  raw attribute markup appended to the tag; not escaped
 * @returns {string}
 */
export function renderIcon(set, name, options = {}) {
  const body = set.icons[name];
  if (body === undefined) {
    throw new IconSetError([`"${name}" is not in this set (have: ${set.names.join(', ')})`]);
  }
  const size = options.size ?? '1em';
  const label =
    options.title === undefined
      ? 'aria-hidden="true"'
      : `role="img" aria-label="${escapeAttr(options.title)}"`;
  const extra = options.attrs ? ` ${options.attrs}` : '';
  return (
    `<svg viewBox="0 0 ${set.grid} ${set.grid}" width="${escapeAttr(size)}" height="${escapeAttr(size)}"` +
    ` fill="none" stroke="currentColor" stroke-width="${set.strokeWidth}"` +
    ` stroke-linecap="${set.linecap}" stroke-linejoin="${set.linejoin}" ${label}${extra}>${body}</svg>`
  );
}
