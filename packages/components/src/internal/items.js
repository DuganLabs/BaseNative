/**
 * Normalise an option item that may be a bare string or a {value,label,disabled}
 * object into the object form. A string is both its value and its label.
 *
 * @param {string | {value?: string, label?: string, disabled?: boolean}} item
 * @returns {{value: string, label: string, disabled: boolean}}
 */
export function normalizeItem(item) {
  if (typeof item === 'string') return { value: item, label: item, disabled: false };
  return { value: item.value, label: item.label, disabled: Boolean(item.disabled) };
}
