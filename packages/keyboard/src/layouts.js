// Built with BaseNative — basenative.dev
/**
 * Layout definitions for @basenative/keyboard.
 *
 * Each layout is `{ rows: Key[][] }` where a Key is either a string
 * (interpreted as a `char` key with that label/key) or an object:
 *
 *   { type: 'char' | 'action', label, key, span?, variant? }
 *
 * `type`     — 'char' emits an `onKey(key)`; 'action' emits `onAction(key)`.
 * `label`    — visible text. May be a glyph (e.g. '⌫').
 * `key`      — emitted value (defaults to label).
 * `span`     — flex grow factor (1 = standard, 1.5 = wide, 2 = doubled).
 * `variant`  — optional class hint: 'enter' | 'backspace' | 'shift' | 'space' | string.
 */

/**
 * Normalize any user-supplied key shape into a canonical Key object.
 * Strings become char keys; partial objects get sensible defaults.
 */
export function normalizeKey(raw) {
  if (typeof raw === 'string') {
    return { type: 'char', label: raw, key: raw, span: 1 };
  }
  if (raw && typeof raw === 'object') {
    const type = raw.type === 'action' ? 'action' : 'char';
    const label = raw.label ?? raw.key ?? '';
    const key = raw.key ?? label;
    return {
      type,
      label,
      key,
      span: typeof raw.span === 'number' && raw.span > 0 ? raw.span : 1,
      variant: raw.variant || undefined,
    };
  }
  return { type: 'char', label: String(raw ?? ''), key: String(raw ?? ''), span: 1 };
}

/**
 * Define a custom layout. Validates row shape and returns a layout
 * object usable in `Keyboard({ layout })`.
 */
export function defineLayout(rows, meta = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError('defineLayout: rows must be a non-empty array');
  }
  const normalized = rows.map((row, ri) => {
    if (!Array.isArray(row)) {
      throw new TypeError(`defineLayout: row ${ri} must be an array`);
    }
    return row.map(normalizeKey);
  });
  return { rows: normalized, name: meta.name || 'custom', ...meta };
}

const ENTER = { type: 'action', label: 'ENT', key: 'ENTER', span: 1.5, variant: 'enter' };
const BACKSPACE = { type: 'action', label: '⌫', key: 'BACKSPACE', span: 1.5, variant: 'backspace' };
const SPACE = { type: 'action', label: 'space', key: ' ', span: 5, variant: 'space' };

/**
 * Built-in layouts. All values are pre-normalized.
 */
export const LAYOUTS = {
  qwerty: defineLayout(
    [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      [ENTER, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', BACKSPACE],
    ],
    { name: 'qwerty' },
  ),

  alphanumeric: defineLayout(
    [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      [ENTER, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', BACKSPACE],
    ],
    { name: 'alphanumeric' },
  ),

  numpad: defineLayout(
    [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [BACKSPACE, '0', ENTER],
    ],
    { name: 'numpad' },
  ),

  phone: defineLayout(
    [
      [{ type: 'char', label: '1', key: '1' }, { type: 'char', label: '2 ABC', key: '2' }, { type: 'char', label: '3 DEF', key: '3' }],
      [{ type: 'char', label: '4 GHI', key: '4' }, { type: 'char', label: '5 JKL', key: '5' }, { type: 'char', label: '6 MNO', key: '6' }],
      [{ type: 'char', label: '7 PQRS', key: '7' }, { type: 'char', label: '8 TUV', key: '8' }, { type: 'char', label: '9 WXYZ', key: '9' }],
      [{ type: 'char', label: '*', key: '*' }, { type: 'char', label: '0 +', key: '0' }, { type: 'char', label: '#', key: '#' }],
      [BACKSPACE, SPACE, ENTER],
    ],
    { name: 'phone' },
  ),
};

/**
 * Shape-validate a layout object. Returns true or throws with a clear
 * message — handy in tests and dev builds.
 */
export function validateLayout(layout) {
  if (!layout || !Array.isArray(layout.rows)) {
    throw new TypeError('validateLayout: layout.rows must be an array');
  }
  for (let ri = 0; ri < layout.rows.length; ri++) {
    const row = layout.rows[ri];
    if (!Array.isArray(row) || row.length === 0) {
      throw new TypeError(`validateLayout: row ${ri} must be a non-empty array`);
    }
    for (let ki = 0; ki < row.length; ki++) {
      const k = row[ki];
      if (!k || (k.type !== 'char' && k.type !== 'action')) {
        throw new TypeError(`validateLayout: row ${ri} key ${ki} has invalid type`);
      }
      if (typeof k.label !== 'string' || typeof k.key !== 'string') {
        throw new TypeError(`validateLayout: row ${ri} key ${ki} must have string label and key`);
      }
    }
  }
  return true;
}
